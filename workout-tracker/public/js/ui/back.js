// Makes the phone's back button close the last opened sheet or screen instead of leaving the page.

const handlers = [];

// Reset to depth 0: a reload would otherwise keep the old entry's depth.
history.replaceState({ depth: 0 }, '');

window.addEventListener('popstate', (e) => {
  const depth = e.state?.depth ?? 0;
  while (handlers.length > depth) handlers.pop()();
});

/** `onBack` runs when the user goes back past this entry. */
export function pushBack(onBack) {
  handlers.push(onBack);
  history.pushState({ depth: handlers.length }, '');
}

export function goBack(steps = 1) {
  history.go(-steps);
}
