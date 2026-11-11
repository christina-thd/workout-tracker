// Entry point: home → sports → dashboard screens, fed by the live server view.
// The server is the source of truth; views only send actions, never mutate locally.
import { subscribe } from './shared/api.js';
import { $ } from './shared/dom.js';
import { sportOf } from './shared/sports.js';
import { RANGE_IDS } from './shared/stats.js';
import { storage } from './shared/storage.js';
import { localDate } from './shared/workouts.js';
import { renderDashboard, TABS, wireDashboard } from './workouts/dashboard.js';
import { renderHome, wireHome } from './workouts/home.js';
import { createListsSheet } from './workouts/lists-sheet.js';
import { renderPersonChip } from './workouts/person-chip.js';
import { createPersonSheet } from './workouts/person-sheet.js';
import { createPurchaseSheet } from './workouts/purchase-sheet.js';
import { createSessionSheet } from './workouts/session-sheet.js';
import { renderSports, wireSports } from './workouts/sports-view.js';
import { goBack, pushBack } from './ui/back.js';
import { showTextWhenMissing } from './ui/emoji.js';
import { icon } from './ui/icons.js';
import { closeTopSheet } from './ui/sheet.js';
import { trackVisibleViewport } from './ui/viewport.js';

/** @type {import('./shared/workouts.js').Person[]} */
let people = [];
/** @type {import('./shared/workouts.js').Session[]} */
let sessions = [];
/** @type {import('./shared/workouts.js').Purchase[]} */
let purchases = [];
let currency = 'EUR';
let loaded = false;
let person = storage.get('workouts.person');
let sport = null;
let range = RANGE_IDS.includes(storage.get('workouts.range')) ? storage.get('workouts.range') : '3m';
let tab = TABS.includes(storage.get('workouts.tab')) ? storage.get('workouts.tab') : 'stats';
/** @type {'home' | 'sports' | 'dashboard'} */
let screen = 'home';
const DEPTH = { home: 0, sports: 1, dashboard: 2 }; // history entries per screen

const sportKey = () => `workouts.sport.${person}`;
const getPerson = () => people.find((p) => p.id === person);
const mine = (list) => list.filter((x) => x.personId === person);

const sessionSheet = createSessionSheet({ getPeople: () => people, getSessions: () => sessions, getCurrency: () => currency });
const purchaseSheet = createPurchaseSheet({ getPurchases: () => purchases, getCurrency: () => currency });
const listsSheet = createListsSheet({ getPerson });
let pickNext = null; // the very first person goes straight to their sports
const personSheet = createPersonSheet({
  getPeople: () => people,
  getSessions: () => sessions,
  onCreated: (id) => {
    if (people.filter((p) => p.id !== id).length === 0) pickNext = id;
  },
  onDeleted: (id) => {
    if (id === person) forgetPerson();
  },
  onClose: () => {
    const id = pickNext;
    pickNext = null;
    if (id) setTimeout(() => pickPerson(id), 0); // after the sheet's history step
  },
});

// ----- screens -----

function pickPerson(id) {
  person = id;
  storage.set('workouts.person', id);
  sport = sportOf(storage.get(sportKey())) ? storage.get(sportKey()) : null;
  pushBack(() => showScreen('home'));
  showScreen('sports');
}

function openSport(id) {
  sport = id;
  storage.set(sportKey(), id);
  pushBack(() => showScreen('sports'));
  showScreen('dashboard');
}

function forgetPerson() {
  person = null;
  storage.set('workouts.person', null);
  goHome();
}

/** Goes through history so the back stack stays consistent. */
function goHome() {
  if (DEPTH[screen]) goBack(DEPTH[screen]);
  else render();
}

function showScreen(name) {
  screen = name;
  $('homeView').hidden = screen !== 'home';
  $('sportsView').hidden = screen !== 'sports';
  $('dashboardView').hidden = screen !== 'dashboard';
  render();
  window.scrollTo(0, 0);
}

function setTab(id) {
  tab = id;
  storage.set('workouts.tab', id);
  render();
  window.scrollTo(0, 0);
}

function setRange(id) {
  range = id;
  storage.set('workouts.range', id);
  render();
}

/** The current person may have been deleted on another device. */
function keepChoicesValid() {
  if (person && !getPerson()) {
    person = null;
    storage.set('workouts.person', null);
    if (screen !== 'home') goHome();
  }
}

function render() {
  if (!loaded) return;
  const today = localDate();
  $('addButton').hidden = screen !== 'dashboard';
  document.body.classList.toggle('has-fab', screen === 'dashboard');
  if (screen === 'home') return renderHome({ people, sessions, current: person, today });
  const who = getPerson();
  if (!who) return;
  if (screen === 'sports') return renderSports({ person: who, sessions: mine(sessions), today });
  const current = sportOf(sport);
  if (!current) return;
  renderPersonChip($('personButton'), who);
  renderDashboard({
    sport: current,
    tab,
    sessions: mine(sessions).filter((s) => s.sport === sport),
    purchases: mine(purchases).filter((p) => p.sport === sport),
    range,
    today,
    currency,
  });
}

function openNew() {
  if (tab === 'gear') purchaseSheet.open({ personId: person, sportId: sport });
  else sessionSheet.open({ personId: person, sportId: sport });
}

// ----- start -----

trackVisibleViewport();
showTextWhenMissing();
wireHome({ onPick: pickPerson, onEdit: (id) => personSheet.open(id), onAdd: () => personSheet.open() });
wireSports({ onPick: openSport, onSwitchPerson: goHome, onLists: () => listsSheet.open() });
wireDashboard({
  onTab: setTab,
  onRange: setRange,
  onOpenSession: (id) => sessionSheet.open({ personId: person, sportId: sport, sessionId: id }),
  onOpenPurchase: (id) => purchaseSheet.open({ personId: person, sportId: sport, purchaseId: id }),
  onBack: () => goBack(),
});
$('personButton').addEventListener('click', goHome);
$('addButton').innerHTML = icon('plus');
$('addButton').addEventListener('click', openNew);

// keyboard: Escape closes the top sheet; n or + adds
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (e.repeat) return;
    return closeTopSheet();
  }
  if (e.key !== 'n' && e.key !== '+') return;
  if (e.ctrlKey || e.metaKey || e.altKey || document.body.classList.contains('locked')) return;
  if (/** @type {Element} */ (e.target).closest('input, textarea, select')) return;
  if ($('addButton').hidden) return;
  e.preventDefault();
  openNew();
});

// charts are drawn at a fixed pixel width, so redraw on width changes
let resizeTimer = null;
let lastWidth = innerWidth;
window.addEventListener('resize', () => {
  if (innerWidth === lastWidth) return; // keyboard only changes height
  lastWidth = innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 120);
});
// keeps "Today"/"Yesterday" correct across midnight
setInterval(render, 5 * 60_000);

subscribe((view) => {
  const first = !loaded;
  people = view.people;
  sessions = view.sessions;
  purchases = view.purchases;
  currency = view.currency;
  loaded = true;
  keepChoicesValid();
  if (first) {
    // restore the last screen, with history entries beneath it so back works
    sport = person && sportOf(storage.get(sportKey())) ? storage.get(sportKey()) : null;
    if (getPerson()) {
      pushBack(() => showScreen('home'));
      if (sport) pushBack(() => showScreen('sports'));
    }
    showScreen(!getPerson() ? 'home' : sport ? 'dashboard' : 'sports');
  } else {
    render();
  }
  personSheet.refresh();
  sessionSheet.refresh();
  purchaseSheet.refresh();
  listsSheet.refresh();
}, showConnection);

// EventSource reconnects on its own; only show Offline after a few seconds down.
let offlineTimer = null;
function showConnection(connected) {
  clearTimeout(offlineTimer);
  if (connected) return document.body.classList.remove('offline');
  offlineTimer = setTimeout(() => document.body.classList.add('offline'), 4000);
}
$('offline').innerHTML = `${icon('offline')}<span>Offline</span>`;
