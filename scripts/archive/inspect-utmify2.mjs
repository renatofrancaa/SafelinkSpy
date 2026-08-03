const r = await fetch("https://cdn.utmify.com.br/scripts/pixel/pixel.js");
const t = await r.text();

// Find Tracker.track and tracking payload
const idx = t.indexOf("tracking.utmify.com.br");
console.log("idx", idx);
console.log(t.slice(Math.max(0, idx - 500), idx + 1500));

console.log("\n\n=== track function snippets ===");
for (const re of [
  /track\([^\)]{0,80}/g,
  /InitiateCheckout/g,
  /pixelId/g,
  /icURLMatch/g,
  /isCheckoutButtonClassList/g,
  /JS-initiate/g,
]) {
  const m = t.match(re);
  console.log(re, m && m.slice(0, 15));
}

// Find class list check
const cidx = t.indexOf("isCheckoutButtonClassList");
console.log("\nclasslist fn", t.slice(cidx, cidx + 800));

const tidx = t.indexOf("static track(");
console.log("\nstatic track", t.slice(tidx, tidx + 2000));
