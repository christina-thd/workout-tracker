# Workout Tracker

Log your workouts and sports, what you buy for them, and see how you're doing. Each sport adds its own details on
top of what every session has: see [Sports](#sports).

## Getting started

1. Open **Workouts** in the Home Assistant sidebar.
2. Tap **Add the first user** and type your name.
3. Pick a sport.
4. Tap the round **+** at the bottom right, check the date and how long it was, pick how it felt, and tap
   **Log session**. That's it.

## Users

Everyone in the house has their own sessions, purchases, players and clubs. The home screen ("Who's this?") has a
tile per user: tap yours. Each phone or PC remembers who picked it
last, the sport and the tab they were on, so after the first time it opens straight where you left off.

To switch user, tap your name at the top right of your sports (the back button works too). On the home screen, **Add user** adds
someone, and **⋯** on a tile renames them, changes their emoji, or deletes them with everything of theirs (type
**delete** to confirm, since it can't be undone).

There are no passwords: anyone can pick anyone. It's for keeping things tidy, not private.

### Choosing your sports

Everyone sees every sport to start with. To keep your list to the ones you do, tap **⚙** next to your name above
your sports and switch sports on or off. Turning one off only hides it: its sessions and purchases
are kept, and turning it back on brings them all back. One sport always stays on.

## Logging a session

The **+** opens a new session (on the Gear tab, a new purchase). It starts with today and as long as your last
session of that sport. Every session has:

| Field | |
|-------|-|
| **Date** | the day of the session |
| **Minutes** | how long; **1h**, **1h 30m**, **2h** and **3h** fill it in (some sports have their own) |
| **How did it feel?** | 😌 Chill, 🙂 Good, 🔥 Intense or 🥵 Exhausting |
| **Cost** | what the session cost you, in the add-on's currency; leave it empty if you don't know |
| **Smartwatch** | average and max heart rate (bpm) and calories, as your watch shows them after the session (not every sport) |
| **Notes** | anything else: what went well, what to work on |

The sport's own details come between them (see [Sports](#sports)), and some sports leave fields out. Only the date
and minutes are needed.

Closing a session (or a purchase) with changes you haven't saved asks first: **Keep editing** or **Discard**.

Tap a session on the **Sessions** tab to change it, or delete it: tap **Delete**, then **Tap again to delete** within
a few seconds (so it can't happen by accident). The message at the bottom still offers **Undo** for a few seconds.
Purchases, and names on your lists (× then **Remove?**), work the same way.

## Players, clubs and places

Partners, opponents, clubs and places are picked from your own lists, so names are always written the same way. Open
**Players, clubs and places** under your sports to add names or take them off (sessions that used a name keep it).
You can also add a name straight from a session: pick **Add new…** at the bottom of a dropdown.

## Gear

The **Gear** tab is for what you buy for a sport: equipment, clothing, lessons, anything else. Tap **+**, say what it
was, pick its kind, the cost and the day. At the top are what you've spent on gear in total and this year, and per
kind. Gear counts in your spending on the Stats tab, next to what sessions cost.

## Stats

Pick the range: **Month** (the last 5 weeks), **3 months**, **Year** or **All**. Everything below follows it.

- **Tiles:** sessions, time played, money spent (sessions and gear), average heart rate, and your streak: weeks in a
  row with at least one session (it counts this week once you've played).
- **Time played** and **Spending:** a bar per week (Month, 3 months) or per month (Year, All; per year after two
  years). Spending stacks what sessions cost and what gear cost.
- **How it felt:** how your sessions split up.
- **Heart rate:** average and max, session by session.

Sports can add their own (see [Sports](#sports)). Point at a bar or a point (or tap it on a phone) to see its numbers.
The sessions themselves are on the **Sessions** tab, newest first, by month.

## Sports

### Padel

A padel session also has:

| Field | |
|-------|-|
| **Session** | 🏆 Match or 🎯 Training |
| **Score** | for a match, set by set (see below) |
| **Result** | Won, Lost or Draw (e.g. a set each when the court time ran out); filled in from the score |
| **Partner**, **Opponents** | who you played with and against, from your players |
| **Club**, **Court** | where, from your clubs, and indoor or outdoor |

A new session starts with the same partner, club and court as your last one.

**The score.** The score card has a box per set for each side: your team on the row with the green dot, your
opponents on the grey one. Tap a box and pick the games (0 to 7).

- It starts with two sets: **+ Set** adds another (up to five), and **− Set** takes the last one away.
- When a set has a 7, a **TB** box appears next to it for the tie-break's points (a 7-6 set). The team with the 7
  won the tie-break, so it can only have more points than the other. The list shows it as 7–6 (7–5).
- Once a set has both sides, **Sets 1–0** shows how it stands, and the **Result** is filled in for you (you can still
  change it).

**Stats.** Padel adds:

- **Win rate** (tile) and **Results:** your matches with a result, won, drawn and lost.
- **Partners:** who you win with most: for each partner, the matches won out of the matches played together (only
  matches with a result count). The best ratio is first; on a tie, the partner you've played more with.

**Gear kinds:** racket, balls, shoes, clothing, grips, bag, lessons, other.

### Tennis

Tennis works like padel (the score with tie-breaks, the result, win rate and results), with a few differences:

| Field | |
|-------|-|
| **Format** | Singles (the default) or Doubles |
| **Partner** | doubles only, from your players |
| **Opponent**, **Opponents** | one in singles, two in doubles |
| **Club**, **Surface**, **Court** | where, from your clubs; hard, clay, grass or carpet; indoor or outdoor |

In singles the score card's rows are **You** and **Opponent**; in doubles, **Your team** and **Opponents**. A new
session starts as singles, at the same club, surface and court as your last one. **Partners** in the stats counts
your doubles matches.

**Gear kinds:** racket, strings, balls, shoes, clothing, grips, bag, lessons, other.

### Basketball

Kept simple: no score, club or partner. A basketball session also has:

| Field | |
|-------|-|
| **Session** | 🎯 Practice (the default) or 🏆 Game |
| **Result** | for a game: Won or Lost |
| **Court** | indoor or outdoor (remembered from your last session) |

**Stats.** Your games add the **Win rate** tile and the **Results** card.

**Gear kinds:** ball, shoes, clothing, bag, lessons, other.

### Snowboard

Different from the others: a snowboard session is the day, how long, how it felt, the **Place** (from your places:
a resort or a slope, remembered from your last session), the cost and notes. It has no session type, court or
smartwatch numbers, so its stats leave out heart rate. The duration shortcuts are **2h**, **3h**, **4h** and **6h**,
and a first session starts at 4h.

**Gear kinds:** board, boots, bindings, helmet, goggles, gloves, clothing, lessons, other.

### Workout

The simplest: just that you trained, and what. A workout is the **Date**, its **Focus** (🦵 Legs, the default,
💪 Arms or 🏋️ Torso) and notes. No minutes, cost, how it felt or smartwatch, and no Gear tab.

**Stats.** The **Sessions** and **Streak** tiles, and a **Sessions** chart: how many workouts per week (Month,
3 months) or per month (Year, All).

## Phone and PC

Everything you change shows up straight away on every screen that has the tracker open. If the connection to Home
Assistant is lost for more than a few seconds, an **Offline** badge shows at the top; it reconnects by itself.

To have it like an app on your phone, open the direct address `http://<your-homeassistant-ip>:3400/` in the browser
and choose **Add to Home Screen**. It works in the Home Assistant app too, from the sidebar. On a PC, press **n** to add
a session (a purchase on the Gear tab) and Escape to close it.

Emoji look the same on every phone and PC: they're drawn with [Twemoji](https://github.com/jdecked/twemoji)
(CC-BY 4.0), loaded from the internet. Without internet, each device's own emoji show instead.

## Install as an app on Android

Chrome on Android only installs an app from a secure (https) address with a trusted certificate. If Home Assistant
already has one for your own domain (e.g. Let's Encrypt, in its `ssl` folder), the add-on can use it:

1. In the add-on's **Configuration** tab, turn on **ssl**. `certfile` and `keyfile` are the certificate's files in the
   `ssl` folder (`fullchain.pem` and `privkey.pem` by default). Restart the add-on.
2. Make your domain point to Home Assistant's address on your home network, e.g. with a DNS rewrite in your router or
   AdGuard Home (`ha.example.com` → your Home Assistant's IP address).
3. On the phone, open `https://<your-domain>:3401/` in Chrome, then ⋮ → **Install app**.

Don't forward port 3401 on your router: there are no passwords, so keep it on your home network. The plain address on
port 3400 keeps working as before, and a renewed certificate is picked up by itself.

## Currency

Costs are shown in euros unless you change **currency** in the add-on's **Configuration** tab to another three-letter
code (GBP, USD, CHF, …). Amounts aren't converted: only how they're shown changes.

## Your data

Users, their lists, sessions and purchases are saved in the add-on's own storage (`/data/workouts.json`) and are
kept across updates and restarts. Home Assistant backups include it.
