# Development

Requires Node.js 22+ (the add-on runs Node 22: the Dockerfile's Alpine 3.22). The add-on itself has no npm
dependencies; `npm install` only brings the dev tools (ESLint, TypeScript as a checker), which aren't shipped.

```sh
npm install         # the dev tools
npm run dev         # http://localhost:3400, restarts on changes
npm test            # unit, HTTP and add-on packaging tests (Node's built-in test runner)
npm run lint        # ESLint (eslint.config.js)
npm run typecheck   # type checks the JavaScript from its JSDoc comments (tsconfig.json); nothing is compiled
npm run check       # all three, as the pull request checks do
```

| Variable     | Default              | Purpose                                 |
|--------------|----------------------|-----------------------------------------|
| `PORT`       | `3400`               | Port to listen on                       |
| `HOST`       | `0.0.0.0`            | Interface to bind                       |
| `STATE_FILE` | `data/workouts.json` | Where users, sessions and purchases are saved |
| `CURRENCY`   | `EUR`                | What costs are shown in (ISO 4217 code) |
| `HTTPS_PORT`, `TLS_CERT`, `TLS_KEY` | off | Also serve https (PEM certificate and key, reloaded when renewed); the add-on uses 3401 with Home Assistant's certificate (`ssl` option) |

The server doesn't know about Home Assistant: in the add-on, `run.sh` sets these variables.

To try it on your phone while developing, open `http://<your-pc-ip>:3400/` on the same Wi-Fi.

## Layout

This folder is a Home Assistant add-on (the files at the top) that contains the app (the rest).
See [_project_architecture.txt](_project_architecture.txt) for every file.

```
config.yaml, Dockerfile, run.sh     Home Assistant add-on
README.md, DOCS.md, CHANGELOG.md    add-on store page, Documentation tab, changelog

src/                      server (Node, no framework, no dependencies)
  server.js               entry point: load config and state, start HTTP (and https), graceful shutdown
  config.js               environment variables
  app.js                  HTTP routes: page, static files, API
  workouts/state.js       state shape, repairing saved data, the view sent to screens
  workouts/actions.js     every action, validated (the only code that changes state)
  store.js                JSON file storage: debounced, atomic writes
  sse.js                  Server-Sent Events hub for live updates
  static.js               safe static file serving
  tls.js                  https certificate: reading it, and reloading it when it's renewed

public/                   browser (plain ES modules, no build step)
  index.html              the page (markup only)
  css/                    base.css (theme, chart colors, shared components), app.css (everything else)
  js/app.js               entry: keeps the latest view, remembers who and what you're looking at, switches the
                          three screens (home → a user's sports → a sport's dashboard), wires the parts
  js/shared/              used by the server too: workouts.js (users, feels, limits, dates, emoji), sports.js
                          (every sport: its fields, gear and lists; scores); page only: stats.js (ranges, totals,
                          chart series), format.js, api, dom, storage
  js/ui/                  reusable pieces (as in the other add-ons): back (phone back button), sheet (bottom
                          sheets, swipe to close), emoji-picker, confirm (type "delete"), viewport, toast, icons;
                          emoji (Twemoji images, the same on every device), menu (the app's own dropdowns: a list,
                          or a number pad), tap-twice (a second tap to delete), discard ("Discard changes?" when a
                          sheet with unsaved changes is closed)
  js/workouts/            home (who's this?), person-sheet (a user: new, rename, emoji, delete), person-chip (the
                          user's emoji and name, top right of the sports), sports-sheet (the ⚙ next to it: each sport
                          on or off), sports-view (a user's sports), lists-sheet (players
                          and clubs), dashboard (the tabs, and Stats: tiles and charts), charts (SVG columns, lines,
                          split bars, tooltips), session-list and gear-list (the other two tabs, by month: rows),
                          session-sheet with sport-fields (the sport's own fields: buttons, dropdowns, the score
                          grid), purchase-sheet

test/                     node:test suites
```

## How it works

**Data flow.** Screens send actions (`POST /api/actions`, e.g. `{ "type": "removeSession", "sessionId": "…" }`).
The server validates and applies the action, saves, and broadcasts the new view to every screen over
`GET /api/events` (Server-Sent Events). Screens never change sessions locally; they only render the latest view.

**Actions:** `addPerson`, `renamePerson`, `setPersonEmoji`, `setSportShown` (a sport on or off for them),
`removePerson` (with everything of theirs), `addToList`, `removeFromList` (a person's players, clubs or places),
`addSession`, `editSession` (replaces every field: the sheet sends them all), `removeSession`, `addPurchase`,
`editPurchase`, `removePurchase`. See `src/workouts/actions.js`.

**Sports on and off:** each person has `hiddenSports`, the ones they turned off (stored that way round so a new sport
is on for everyone). Off only hides the sport (`sportsFor` in sports.js): its sessions and purchases stay, and the
page goes back to the sports list if the sport it was on is turned off. At least one stays on.

**Sessions** have what every sport has (`date`, `minutes`, `feel`, `cost`, `avgHr`, `maxHr`, `calories`, `note`) and
the sport's own `details`. Dates are plain days (`YYYY-MM-DD`, the day as you'd say it), so time zones never move a
session to another day. Money is rounded to cents; empty fields are `null`, not 0.

**Purchases** are what was bought for a sport (`item`, `category` from the sport's `gear`, `cost`, `date`, `note`). They
count in the Stats tab's spending next to what sessions cost, and have their own tab.

**Sports** are data, in `public/js/shared/sports.js`: each has fields and gear, and the server validates `details`
against them (`cleanDetails`) while the session sheet builds its form from them (`js/workouts/sport-fields.js`). A
field is a `choice` (buttons), a `pick` (a dropdown of one of the person's lists; `count` for several) or a `score`
(games per set). It can show only `when` other fields have those values (a match's score; tennis's partner only in
doubles), be the `result` the win rate comes from, the `partner` the partners stats count, or be `remember`ed from
the last session. Fields several sports share (the session type, score, result, club, court, racket gear) are
defined once at the top of the file. **Adding a sport is adding an entry there**: the sports
screen, the sheet, validation and the dashboard pick it up.

**Players, clubs and places** are lists on each person (`person.players`, `person.clubs`, `person.places`: one per
`LISTS` entry, filled in on load for people saved before a list existed). A session stores the names it
picked, not references, so taking a name off a list never changes a session; names a session picks are added to the
lists. Schema 1 (before lists) fills them from the names its sessions used.

**Scores** are stored as written ("6-4 3-6 7-6(7-5)", your games first; a 7-6 set can have its tie-break's points
in brackets, and the side with the 7 always has more of them).

**Dropdowns** are the app's own (`js/ui/menu.js`), not the system's `<select>`, whose open list can't be styled and
looks different on every device: a button opens a panel of options under it (a number pad for a score's box). The sheet's grid fills in the result from the sets
(`scoreResult`); the result can still be changed by hand.

**Emoji** are Twemoji SVGs from jsDelivr (`js/ui/emoji.js`, pinned version), so they look the same on Android, iOS and
Windows; if one can't load, the emoji's own character shows. Dropdown options stay plain text.

**Charts** are drawn as SVG at the width they're shown (`js/workouts/charts.js`), so text stays the same size on any
screen; they're drawn again when the width changes. The numbers come from `js/shared/stats.js`, which is pure and
tested. Colors are CSS variables in `css/base.css`, checked for colour-blind separation and contrast against the dark
surface: blue for time and wins, aqua for what sessions cost with violet for gear stacked on it, orange for max heart
rate, red for losses, and one blue getting lighter for how sessions felt (chill → exhausting). Every mark has a
tooltip; text is never colored by its series.

**Users** are called people in the code and the saved data (`Person`, `people`, `personId`), as in the other
add-ons; the page says "user". Everyone has their own sessions, purchases and lists. There are no passwords: the home
screen lets anyone pick anyone, and the device remembers who.

**Unsaved changes:** a sheet created with `hasChanges` (the session and purchase sheets compare their fields with how
they opened) asks "Discard changes?" before closing, however it's closed: Close, the backdrop, a swipe, Escape or the
back button (whose history entry is put back while it asks). Closing after saving or deleting passes `force`.

**Deleting** a session, a purchase or a name takes a second tap (`js/ui/tap-twice.js`) and offers Undo; deleting a
user, with everything of theirs, asks for "delete" to be typed (`js/ui/confirm.js`).

**Saved data** is versioned (`schema`, now 2). `normalizeState` repairs anything odd in the file on load (unknown
values fall back to defaults; sessions without a person, a sport, a real day or minutes are dropped, and purchases
without an item or a cost), so a bad edit can't break the app.

**Updates while a page is open:** every view carries the app version; a page that sees a new version reloads itself.

**Remembered per device** (localStorage): who you are, the sport you were on (per person), the tab and the range.

**Back button:** opening a screen or a sheet adds a history entry, so the phone's back button (and the Home Assistant
app's) goes back a step instead of leaving the page (`js/ui/back.js`).

**Paths are relative** (`api/actions`, `css/…`), so the app also works in the Home Assistant sidebar, which serves it
under `/api/hassio_ingress/<token>/`.

## Adding a sport

1. Add an entry to `SPORTS` in `public/js/shared/sports.js`: `id`, `name`, `emoji`, its `fields` (or none) and its
   `gear` kinds. A sport Unicode has no emoji for gets its own `image` too (an SVG in `public/img/sports/`, drawn
   flat like Twemoji, as padel's is). `tracks` leaves out fields every session otherwise has: `{ time, feel, cost,
   watch }` set to false (snowboard: no smartwatch; workout: none of them). The sheet hides them, the server stores
   them as null, and the stats drop their tiles and charts (without time, a Sessions chart takes Time played's
   place). `gear: []` removes the Gear tab. `durations` and `defaultMinutes` suit longer sessions (snowboard: 2h–6h,
   starting at 4h). A new kind of name (like `places`) is an entry in `LISTS`. The sports screen, the session sheet, validation and the stats pick it up; a `result` field adds the
   win rate and results, and a single `pick` of players the partners card.
2. Add a test for anything new it validates (`test/sports.test.js`).
3. Document it: a row in the repository's `README.md` table, a section under **Sports** in this add-on's `README.md`
   and `DOCS.md`, and a line in `CHANGELOG.md`.

## Releasing a new version

1. Bump `version` in **both** `config.yaml` and `package.json` (a test fails if they differ).
2. Add an entry at the top of `CHANGELOG.md`.
3. Run `npm run check`, then open a pull request into `main`: it checks the version went up and runs lint, types
   and tests. Merging releases it: Home Assistant shows the update in the add-on store.

The sessions are kept in the add-on's `/data` folder across updates.

## Store images

`icon.png` (128×128) and `logo.png` (250×100) are what Home Assistant shows in the add-on store.
They are rendered from `public/img/logo.svg` and `art/store-logo.svg`, together with the home-screen
icons in `public/img/`; after changing either, run:

```sh
docker run --rm -v "$PWD:/addon" -w /addon alpine:3.20 sh art/render.sh
```

## Testing the add-on image locally

```sh
docker build --build-arg BUILD_ARCH=amd64 -t workout-tracker .    # BUILD_FROM defaults to the Home Assistant base image
docker run --rm -p 3400:3400 -v workout-tracker-data:/data workout-tracker
```
