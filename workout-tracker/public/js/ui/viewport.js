// Mirrors the visual viewport into CSS variables so sheets sit above the on-screen keyboard.

export function trackVisibleViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const root = document.documentElement.style;
  const standalone = Boolean(/** @type {any} */ (navigator).standalone);

  // iOS standalone mode can leave the page short of the screen bottom; base.css subtracts this gap
  // from --safe-bottom since the home bar no longer overlaps the page.
  function missing() {
    if (!standalone) return 0;
    const screenHeight = innerWidth > innerHeight ? screen.width : screen.height;
    const gap = screenHeight - innerHeight;
    return gap > 0 && gap <= 160 ? gap : 0;
  }

  function update() {
    root.setProperty('--viewport-top', `${viewport.offsetTop}px`);
    root.setProperty('--viewport-height', `${viewport.height}px`);
    root.setProperty('--viewport-gap', `${missing()}px`);
  }

  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update); // iOS pans the page when the keyboard opens
  window.addEventListener('resize', update);
  update();

  // WebKit quirk: in standalone mode the viewport is mismeasured until the first scroll, so nudge it.
  if (standalone) {
    const settle = () => {
      const { scrollY } = window;
      window.scrollTo(0, scrollY + 1);
      window.scrollTo(0, scrollY);
      update();
    };
    window.addEventListener('load', () => requestAnimationFrame(settle), { once: true });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) requestAnimationFrame(settle); // restored from bfcache
    });
  }
}
