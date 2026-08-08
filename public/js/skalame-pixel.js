/**
 * Skalame / Vega Checkout pixel
 * Safe to load next to UTMify — separate globals, no shared API.
 */
(function () {
  if (window.__SKALAME_PIXEL__) return;
  window.__SKALAME_PIXEL__ = true;

  window.pixelId = "pc_MJ7kVD1eFBf5UxWG3l5oT35BBCB6V0snvY9HRjfB";
  window.skalameApiBaseUrl = "https://skalame.vegacheckout.com.br";

  var a = document.createElement("script");
  a.setAttribute("async", "");
  a.setAttribute("defer", "");
  a.setAttribute(
    "src",
    "https://skalame.vegacheckout.com.br/scripts/pixel.js?v=" + Date.now()
  );
  (document.head || document.documentElement).appendChild(a);
})();
