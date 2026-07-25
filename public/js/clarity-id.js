/**
 * Microsoft Clarity — Project ID (SpyNew)
 * https://clarity.microsoft.com → Settings → Setup
 * Loaded on black funnel steps only (not famguard).
 */
window.CLARITY_PROJECT_ID = "xqkud5a0mc";

// Boot immediately so Clarity works even before zs-analytics
(function bootClarityEarly() {
  var id = window.CLARITY_PROJECT_ID;
  if (!id || window.__ZS_CLARITY__) return;
  try {
    var path = (location.pathname || "").toLowerCase();
    if (path.indexOf("famguard") !== -1) return;
    if (path === "/white" || path === "/white/") return;
    if (path.indexOf("/dashboard") === 0) return;
  } catch (e0) {}
  window.__ZS_CLARITY__ = true;
  (function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", id);
})();
