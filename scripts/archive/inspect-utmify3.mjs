const r = await fetch("https://cdn.utmify.com.br/scripts/pixel/pixel.js");
const t = await r.text();

function around(label, needle, after = 1500) {
  const idx = t.indexOf(needle);
  console.log(`\n=== ${label} @ ${idx} ===`);
  if (idx < 0) return;
  console.log(t.slice(idx, idx + after));
}

around("getEventData", "getEventData()");
around("icCSSMatch assign", "icCSSMatch");
around("checkoutButtonKeywors", "checkoutButtonKeywors");
around("isCheckoutButtonClassList def", "isCheckoutButtonClassList(t)");
