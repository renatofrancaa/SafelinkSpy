const codes = [
  ["up1", "PPU38CQ94G5"],
  ["up2", "PPU38CQ95O6"],
  ["up3", "PPU38CQ95OE"],
  ["up4", "PPU38CQ95OL"],
  ["up5", "PPU38CQ95Q0"],
  ["up6", "PPU38CQ95Q7"],
  ["up7", "PPU38CQ95R6"],
];

for (const [id, c] of codes) {
  const res = await fetch(`https://checkout.centerpag.com/pay/${c}?upsell=true`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128" },
  });
  const html = await res.text();
  console.log("====", id, c, "len", html.length);

  const plan = html.match(/PLAN_CODE\s*=\s*"([^"]+)"/);
  console.log("PLAN", plan?.[1]);

  // dataLayer begin_checkout with value
  for (const m of html.matchAll(/dataLayer\.push\((\{[\s\S]*?"event"\s*:\s*"begin_checkout"[\s\S]*?\})\)\s*;/g)) {
    const raw = m[1];
    if (raw.includes("value") || raw.includes("price")) {
      try {
        // loose JSON-ish may use single quotes — try extract key fields
        const value = raw.match(/"value"\s*:\s*([0-9.]+)/)?.[1];
        const price = raw.match(/"price"\s*:\s*([0-9.]+)/)?.[1];
        const name = raw.match(/"product_name"\s*:\s*"([^"]+)"/)?.[1];
        const planName = raw.match(/"product_plan_name"\s*:\s*"([^"]+)"/)?.[1];
        console.log("begin_checkout", { name, planName, value, price, snippet: raw.slice(0, 350) });
      } catch {
        console.log("begin_checkout raw", raw.slice(0, 350));
      }
    }
  }

  const values = [...new Set([...html.matchAll(/"value"\s*:\s*([0-9.]+)/g)].map((m) => m[1]))];
  const prices = [...new Set([...html.matchAll(/"price"\s*:\s*([0-9.]+)/g)].map((m) => m[1]))];
  console.log("all values", values);
  console.log("all prices", prices);

  // Common PerfectPay/CenterPag fields
  for (const key of [
    "price_without_tax",
    "priceWithoutTax",
    "amount_without_tax",
    "sale_price",
    "product_price",
    "unit_price",
    "amount",
    "original_price",
    "finalProductPriceWithoutTaxes",
  ]) {
    const re = new RegExp(`"${key}"\\s*:\\s*([0-9.]+)`, "g");
    const found = [...html.matchAll(re)].map((m) => m[1]);
    if (found.length) console.log(key, [...new Set(found)]);
  }

  // Snippets around price numbers near product
  const idx = html.search(/without.?tax/i);
  if (idx >= 0) console.log("without tax ctx:", html.slice(Math.max(0, idx - 60), idx + 180).replace(/\s+/g, " "));

  const idx2 = html.indexOf("productPlan");
  if (idx2 >= 0) console.log("productPlan ctx:", html.slice(idx2, idx2 + 300).replace(/\s+/g, " "));

  const idx3 = html.indexOf('"price"');
  if (idx3 >= 0) console.log("first price ctx:", html.slice(idx3, idx3 + 200).replace(/\s+/g, " "));

  // Vue/app bootstrap: look for CREATE_APP or checkoutConfig
  for (const key of ["checkoutConfig", "productConfig", "orderData", "vueData", "window.checkout"]) {
    if (html.includes(key)) console.log("has", key);
  }
}
