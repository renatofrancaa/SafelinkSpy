import { writeFileSync } from "fs";

const codes = [
  ["up1", "PPU38CQ94G5"],
  ["up2", "PPU38CQ95O6"],
  ["up3", "PPU38CQ95OE"],
  ["up4", "PPU38CQ95OL"],
  ["up5", "PPU38CQ95Q0"],
  ["up6", "PPU38CQ95Q7"],
  ["up7", "PPU38CQ95R6"],
];

function pickHiddens(html) {
  const out = {};
  for (const m of html.matchAll(
    /<input[^>]*type=["']hidden["'][^>]*>/gi
  )) {
    const tag = m[0];
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1];
    const key = id || name;
    if (key) out[key] = value;
  }
  return out;
}

function extractNumbersNear(html, needle, radius = 200) {
  const idx = html.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return null;
  const snip = html.slice(Math.max(0, idx - 40), idx + radius);
  const nums = [...snip.matchAll(/([0-9]+\.[0-9]{2}|[0-9]+)/g)].map((m) => m[1]);
  return { snip: snip.replace(/\s+/g, " ").slice(0, 280), nums };
}

for (const [id, c] of codes) {
  const res = await fetch(`https://checkout.centerpag.com/pay/${c}?upsell=true`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await res.text();
  if (id === "up1") writeFileSync("scripts/_chk-up1.html", html);

  const h = pickHiddens(html);
  const interesting = Object.fromEntries(
    Object.entries(h).filter(([k]) =>
      /price|amount|tax|plan|product|currency|value|code/i.test(k)
    )
  );

  // Search script assignments
  const assigns = {};
  for (const re of [
    /const\s+([A-Z0-9_]+)\s*=\s*"([^"]*)"/g,
    /const\s+([A-Z0-9_]+)\s*=\s*([0-9.]+)/g,
    /let\s+([A-Z0-9_]+)\s*=\s*([0-9.]+)/g,
    /var\s+([A-Z0-9_]+)\s*=\s*([0-9.]+)/g,
  ]) {
    for (const m of html.matchAll(re)) {
      if (/PRICE|AMOUNT|TAX|PLAN|PRODUCT|VALUE|MIN_ORDER/i.test(m[1])) {
        assigns[m[1]] = m[2];
      }
    }
  }

  // Look for app create / vue data bootstrap with numeric prices
  const vuePriceBlocks = [];
  for (const m of html.matchAll(
    /(?:product_price|sale_price|unit_price|amount|price_without_tax|priceWithoutTaxes|taxes_amount|tax_amount)\D{0,20}([0-9]+\.[0-9]{2})/gi
  )) {
    vuePriceBlocks.push(m[0].replace(/\s+/g, " ").slice(0, 120));
  }

  // dataLayer value (often total with default location tax)
  const dlValue = html.match(
    /"event"\s*:\s*"begin_checkout"[\s\S]{0,400}?"value"\s*:\s*([0-9.]+)/
  )?.[1];
  const dlPrice = html.match(
    /"event"\s*:\s*"begin_checkout"[\s\S]{0,600}?"price"\s*:\s*([0-9.]+)/
  )?.[1];

  // Try to find plan price in PHP-rendered JSON
  const jsonCandidates = [];
  for (const m of html.matchAll(
    /\{[^{}]{0,40}"(?:price|amount)"\s*:\s*[0-9.]+[^{}]{0,200}\}/g
  )) {
    jsonCandidates.push(m[0].slice(0, 220));
  }

  console.log("\n====", id, c);
  console.log("dlValue", dlValue, "dlPrice", dlPrice);
  console.log("assigns", assigns);
  console.log("interesting hiddens", interesting);
  console.log("vuePriceBlocks", [...new Set(vuePriceBlocks)].slice(0, 10));
  console.log("jsonCandidates", jsonCandidates.slice(0, 5));
  console.log("near amount:", extractNumbersNear(html, "amount"));
  console.log("near product_plan:", extractNumbersNear(html, "product_plan"));
}

// Also try public API patterns
console.log("\n--- API probes ---");
for (const [id, c] of codes.slice(0, 2)) {
  const urls = [
    `https://checkout.centerpag.com/api/checkout/${c}`,
    `https://checkout.centerpag.com/api/pay/${c}`,
    `https://checkout.centerpag.com/payments/checkout/${c}`,
    `https://checkout.centerpag.com/pay/${c}/data`,
    `https://api.centerpag.com/checkout/${c}`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      });
      const t = await r.text();
      console.log(id, r.status, u, t.slice(0, 160).replace(/\s+/g, " "));
    } catch (e) {
      console.log(id, "ERR", u, e.message);
    }
  }
}
