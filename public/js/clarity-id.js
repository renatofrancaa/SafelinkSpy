/**
 * Microsoft Clarity — Project ID xqkud5a0mc
 * ONLY on /upsell/* pages (not funnel steps, not dashboard).
 */
window.CLARITY_PROJECT_ID = "xqkud5a0mc";

(function bootClarityUpsellOnly() {
  var id = window.CLARITY_PROJECT_ID;
  if (!id || window.__ZS_CLARITY__) return;

  try {
    var path = (location.pathname || "").toLowerCase();
    // Only upsell chain
    if (path.indexOf("/upsell") === -1) return;
    // Never admin
    if (path.indexOf("/dashboard") === 0) return;
  } catch (e0) {
    return;
  }

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
