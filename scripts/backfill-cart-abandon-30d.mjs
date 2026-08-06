/**
 * Backfill cart-abandon 7-email sequence for last 30 days.
 * Sources: Google Sheets "Leads" (+ optional Cart Abandoned) via n8n temp workflow,
 * exclude anyone approved on PerfectPay in the same window.
 *
 * Env: N8N_API_KEY, N8N_BASE_URL, PERFECTPAY_API_TOKEN
 *   optional N8N_CART_WEBHOOK_URL
 *
 *   node scripts/backfill-cart-abandon-30d.mjs --dry-run
 *   node scripts/backfill-cart-abandon-30d.mjs --live
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const live = process.argv.includes("--live");
const dry = !live;

function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(root, ".env.perfectpay.tmp"));
loadEnv(path.join(root, ".env.local"));

const N8N_BASE = process.env.N8N_BASE_URL || "https://infosd.app.n8n.cloud";
const N8N_KEY = process.env.N8N_API_KEY || "";
const PP_TOKEN = process.env.PERFECTPAY_API_TOKEN || "";
const CART_URL =
  process.env.N8N_CART_WEBHOOK_URL ||
  "https://infosd.app.n8n.cloud/webhook/cart-abandoned";

const DOC_ID = "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU";
const SHEETS_CRED = {
  googleSheetsOAuth2Api: {
    id: "cPUIPb2SjjiZpCfg",
    name: "Google Sheets account",
  },
};

function str(v, max = 200) {
  if (v == null) return "";
  return String(v).trim().slice(0, max);
}

function dateSP(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysSP(isoDay, delta) {
  const [y, m, d] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 15, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dateSP(dt);
}

function isPurchasedFlag(v) {
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  return s === "true" || s === "yes" || s === "1" || s === "purchased";
}

function parseRowDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  // ISO or sheets date
  const t = Date.parse(s);
  if (!isNaN(t)) return t;
  return null;
}

async function n8nApi(method, p, body) {
  const r = await fetch(N8N_BASE + p, {
    method,
    headers: {
      "X-N8N-API-KEY": N8N_KEY,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

async function fetchSheetRows(sheetName, sheetGid) {
  // Use n8n Google Sheets "read" via one-shot webhook workflow, responseMode lastNode
  // For many rows, use operation getAll / read without filter
  const pathSeg = "tmp-read-sheet-" + Date.now().toString(36);
  const sheetRl = sheetGid
    ? {
        __rl: true,
        value: sheetGid,
        mode: "list",
        cachedResultName: sheetName,
      }
    : { __rl: true, value: sheetName, mode: "name" };

  const wf = {
    name: "TMP Read " + sheetName,
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: pathSeg,
          responseMode: "lastNode",
          options: {},
        },
        id: "wh",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [200, 300],
        webhookId: pathSeg,
      },
      {
        parameters: {
          authentication: "oAuth2",
          resource: "sheet",
          operation: "read",
          documentId: {
            __rl: true,
            value: DOC_ID,
            mode: "list",
            cachedResultName: "App Spy - Leads Recovery ",
          },
          sheetName: sheetRl,
          options: {
            returnAllMatches: true,
          },
        },
        id: "read",
        name: "Read",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4.5,
        position: [440, 300],
        credentials: SHEETS_CRED,
      },
    ],
    connections: {
      Webhook: { main: [[{ node: "Read", type: "main", index: 0 }]] },
    },
    settings: { executionOrder: "v1" },
  };

  // cleanup old tmp
  const list = await n8nApi("GET", "/api/v1/workflows");
  for (const w of list.j.data || []) {
    if ((w.name || "").startsWith("TMP Read ")) {
      await n8nApi("DELETE", `/api/v1/workflows/${w.id}`).catch(() => {});
    }
  }

  const created = await n8nApi("POST", "/api/v1/workflows", wf);
  if (created.status >= 400) {
    throw new Error("create read wf: " + JSON.stringify(created.j).slice(0, 300));
  }
  const id = (created.j.data || created.j).id;
  await n8nApi("POST", `/api/v1/workflows/${id}/activate`);
  await new Promise((r) => setTimeout(r, 2500));

  const hit = await fetch(N8N_BASE + "/webhook/" + pathSeg, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const text = await hit.text();
  let rows = [];
  try {
    const parsed = JSON.parse(text);
    // lastNode can return array or single object or {data:[]}
    if (Array.isArray(parsed)) rows = parsed;
    else if (parsed && Array.isArray(parsed.data)) rows = parsed.data;
    else if (parsed && typeof parsed === "object") rows = [parsed];
  } catch {
    // maybe multi-item concatenated
    console.log("sheet response not pure JSON, len", text.length);
  }

  // Prefer execution data if webhook response is truncated
  await new Promise((r) => setTimeout(r, 2000));
  const ex = await n8nApi(
    "GET",
    `/api/v1/executions?limit=1&workflowId=${encodeURIComponent(id)}`
  );
  const eid = ex.j.data?.[0]?.id;
  if (eid) {
    const det = await n8nApi(
      "GET",
      `/api/v1/executions/${eid}?includeData=true`
    );
    const runData =
      det.j.data?.resultData?.runData || det.j.resultData?.runData;
    const main = runData?.Read?.[0]?.data?.main?.[0];
    if (Array.isArray(main) && main.length) {
      rows = main.map((i) => i.json).filter(Boolean);
    }
  }

  await n8nApi("POST", `/api/v1/workflows/${id}/deactivate`).catch(() => {});
  await n8nApi("DELETE", `/api/v1/workflows/${id}`).catch(() => {});
  console.log(`sheet "${sheetName}" rows:`, rows.length);
  return rows;
}

async function fetchPerfectPayApproved(start, end) {
  if (!PP_TOKEN) {
    console.log("no PERFECTPAY_API_TOKEN — skip purchase exclusion from PP");
    return new Set();
  }
  const approved = new Set();
  let page = 1;
  let lastPage = 1;
  do {
    const res = await fetch(
      "https://app.perfectpay.com.br/api/v1/sales/get",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + PP_TOKEN,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          page,
          paginate: 100,
          start_date_sale: start,
          end_date_sale: end,
        }),
      }
    );
    const text = await res.text();
    let j;
    try {
      j = JSON.parse(text);
    } catch {
      console.log("PerfectPay non-JSON page", page, res.status, text.slice(0, 80));
      break;
    }
    if (!res.ok) {
      console.log("PerfectPay error", res.status, JSON.stringify(j).slice(0, 200));
      break;
    }
    const sales = j.sales || {};
    const data = Array.isArray(sales.data) ? sales.data : [];
    lastPage = Number(sales.total_pages || 1) || 1;
    for (const row of data) {
      const st = Number(row.sale_status_enum ?? row.sale_status);
      const s = String(row.sale_status_enum ?? row.sale_status ?? "").toLowerCase();
      const isOk =
        st === 2 ||
        st === 8 ||
        st === 10 ||
        s.includes("approv") ||
        s.includes("aprov") ||
        s.includes("complet");
      if (!isOk) continue;
      const c = Array.isArray(row.customer)
        ? row.customer[0]
        : row.customer || {};
      const em = str(c.email || row.email, 120).toLowerCase();
      if (em.includes("@")) approved.add(em);
    }
    page += 1;
  } while (page <= lastPage && page <= 80);
  console.log("PerfectPay approved emails:", approved.size);
  return approved;
}

function normalizeLead(row) {
  const email = str(
    row.email || row.Email || row.EMAIL,
    120
  ).toLowerCase();
  const name = str(row.name || row.Name || row.nome || "", 120);
  const phone = str(
    row.phone ||
      row["phone "] ||
      row.Phone ||
      row.telefone ||
      "",
    40
  ).replace(/^\+/, "");
  const purchased =
    row.purchased ??
    row["purchased "] ??
    row.Purchased ??
    row.status;
  const created =
    row.created_at ||
    row.createdAt ||
    row["created_at"] ||
    row.date ||
    row.timestamp;
  return {
    email,
    name,
    phone,
    purchased: isPurchasedFlag(purchased) || String(purchased).toLowerCase() === "purchased",
    createdAt: parseRowDate(created),
    status: str(row.status || "", 40),
  };
}

console.log("mode:", dry ? "DRY-RUN" : "LIVE");
console.log("n8n key:", N8N_KEY ? "yes" : "NO");
console.log("pp token:", PP_TOKEN ? "yes" : "NO");
console.log("cart url:", CART_URL);

if (!N8N_KEY) {
  console.error("N8N_API_KEY required to read Google Sheets");
  process.exit(1);
}

const end = dateSP();
const start = addDaysSP(end, -29);
const cutoff = Date.parse(start + "T00:00:00-03:00");
console.log("range SP:", start, "→", end, "cutoff ms", cutoff);

const [leadsRows, cartRows, approved] = await Promise.all([
  fetchSheetRows("Leads", 1597998998),
  fetchSheetRows("Cart Abandoned", null).catch((e) => {
    console.log("Cart Abandoned read skip:", e.message);
    return [];
  }),
  fetchPerfectPayApproved(start, end),
]);

const byEmail = new Map();

function isTestEmail(email) {
  const e = email.toLowerCase();
  return (
    e.includes("example.com") ||
    e.includes("seed@") ||
    e.includes("probe@") ||
    e.includes("test@") ||
    e.includes("teste") ||
    e.endsWith("@test.com") ||
    e.includes("n8n")
  );
}

function consider(row, source) {
  const L = normalizeLead(row);
  if (!L.email || !L.email.includes("@")) return;
  if (isTestEmail(L.email)) return;
  if (L.purchased) return;
  if (String(L.status).toLowerCase() === "purchased") return;
  if (approved.has(L.email)) return;
  // Prefer last 30 days when date present; include undated leads (legacy rows)
  if (L.createdAt && L.createdAt < cutoff) return;

  const prev = byEmail.get(L.email);
  if (!prev) {
    byEmail.set(L.email, { ...L, source });
  } else {
    if (!prev.name && L.name) prev.name = L.name;
    if (!prev.phone && L.phone) prev.phone = L.phone;
    if (L.createdAt && (!prev.createdAt || L.createdAt > prev.createdAt)) {
      prev.createdAt = L.createdAt;
    }
  }
}

for (const r of leadsRows) consider(r, "Leads");
for (const r of cartRows) consider(r, "Cart Abandoned");

// If no created_at on many rows, include all non-purchased from sheets
// (already did — only exclude old if date present)

const targets = [...byEmail.values()];
console.log("targets to fire:", targets.length);
for (const t of targets.slice(0, 40)) {
  console.log(" -", t.email, "|", t.name || "-", "|", t.phone || "-", "|", t.source);
}
if (targets.length > 40) console.log(" ... +" + (targets.length - 40) + " more");

if (dry) {
  console.log("\nDry-run only. Re-run with --live to POST cart-abandoned.");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const t of targets) {
  try {
    const res = await fetch(CART_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: t.email,
        name: t.name,
        phone: t.phone,
        status: "cart_abandoned",
        purchased: false,
        source: "backfill_cart_30d",
        utm_medium: "cart_abandon",
        utm_campaign: "backfill_30d",
      }),
    });
    const body = await res.text();
    if (res.ok) {
      ok += 1;
      if (ok % 20 === 0 || ok <= 5)
        console.log("OK", ok + "/" + targets.length, t.email);
    } else {
      fail += 1;
      console.log("FAIL", t.email, res.status, body.slice(0, 100));
    }
    await new Promise((r) => setTimeout(r, 350));
  } catch (e) {
    fail += 1;
    console.log("ERR", t.email, e.message);
  }
}
console.log("DONE ok=", ok, "fail=", fail, "total=", targets.length);
