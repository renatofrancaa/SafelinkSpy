/**
 * Fire a real InitiateCheckout event to UTMify tracking API
 */

const PIXEL_ID = "69c69f3ce78656ea3823d1f1";
const API = "https://tracking.utmify.com.br/tracking/v1/events";

function rid(n = 8) {
  return Math.random().toString(36).slice(2, 2 + n);
}

const now = Date.now();
const visitor = `probe_${now}_${rid()}`;

const body = {
  type: "InitiateCheckout",
  lead: {
    pixelId: PIXEL_ID,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    parameters:
      "?utm_source=manual_test&utm_medium=agent&utm_campaign=test_initiate_checkout",
    fbc: `fb.1.${now}.testfbclid${rid(6)}`,
    fbp: `fb.1.${now}.${Math.floor(Math.random() * 1e10)}`,
    firstName: "Test",
    lastName: "Checkout",
    locale: "pt-BR",
    icCSSMatch: "JS-initiate-checkout",
    icTextMatch: null,
    icURLMatch: null,
  },
  event: {
    type: "InitiateCheckout",
    pageTitle: "App Spy — Unlock Full Access",
    sourceUrl: "https://diginest.site/step6.html",
    event_id: `${now}.${rid(10)}`,
    event_time: Math.floor(now / 1000),
    event_source_url: "https://diginest.site/step6.html",
    action_source: "website",
    custom_data: {
      value: 67,
      currency: "USD",
      content_name: "$67 Complete",
      content_ids: ["PPU38CQE9ME"],
      content_type: "product",
      num_items: 1,
    },
    log: {
      leadData: {
        source: "manual_agent_fire",
        visitorId: visitor,
      },
    },
  },
  tikTokPageInfo: null,
};

console.log("POST", API);
console.log("pixelId", PIXEL_ID);
console.log("type", body.type);

const res = await fetch(API, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://diginest.site",
    Referer: "https://diginest.site/step6.html",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log("status", res.status);
console.log("response", text.slice(0, 3000));

try {
  const j = JSON.parse(text);
  if (j.lead) {
    console.log("\n✅ lead._id =", j.lead._id);
    console.log("pixelId =", j.lead.pixelId);
  }
  if (j.event) console.log("event snippet =", JSON.stringify(j.event).slice(0, 800));
} catch {
  /* raw */
}
