/**
 * Block browser Back on early funnel steps.
 * User stays on the current page — nothing happens.
 * Step 6 uses its own handler (backredirect) and must NOT load this file.
 */
(function () {
  if (window.__slBlockBack) return;
  window.__slBlockBack = true;

  function trap() {
    try {
      history.pushState({ slBlockBack: 1, t: Date.now() }, "", location.href);
    } catch (e) {}
  }

  // Stack several entries so one/two Back presses never leave this page
  trap();
  trap();
  trap();
  setTimeout(trap, 0);
  setTimeout(trap, 50);
  setTimeout(trap, 150);
  setTimeout(trap, 400);
  setTimeout(trap, 1000);

  window.addEventListener(
    "popstate",
    function () {
      // Re-arm immediately — stay here, no navigation
      trap();
      trap();
    },
    true
  );

  // Re-trap when tab becomes visible again (some mobile browsers drop traps)
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") trap();
  });
})();
