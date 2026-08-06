/**
 * Backfill cancel-recovery emails from PerfectPay rejected/cancelled sales.
 *
 * Usage:
 *   node scripts/backfill-cancel-today.mjs --days=30 --dry-run
 *   node scripts/backfill-cancel-today.mjs --days=30 --live
 *
 * Env: PERFECTPAY_API_TOKEN, optional N8N_CANCEL_WEBHOOK_URL
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const live = process.argv.includes("--live");
const dry = !live;
const daysArg = process.argv.find((a) => a.startsWith("--days="));
const DAYS = daysArg ? Math.max(1, Number(daysArg.split("=")[1]) || 30) : 30;

function loadEnvFile(p) {
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
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvFile(path.join(root, ".env.perfectpay.tmp"));
loadEnvFile(path.join(root, ".env.local"));

const TOKEN = (process.env.PERFECTPAY_API_TOKEN || "").trim();
const N8N_URL = (
  process.env.N8N_CANCEL_WEBHOOK_URL ||
  "https://infosd.app.n8n.cloud/webhook/order-cancelled"
).trim();

const API = "https://app.perfectpay.com.br/api/v1/sales/get";

function dateSP(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysSP(isoDay, delta) {
  // isoDay YYYY-MM-DD as calendar date in SP — approximate via UTC noon
  const [y, m, d] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 15, 0, 0)); // ~noon SP
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dateSP(dt);
}

function str(v, max = 200) {
  if (v == null) return "";
  return String(v).trim().slice(0, max);
}

function statusNum(row) {
  const raw = row.sale_status_enum ?? row.sale_status ?? row.status;
  const n = Number(raw);
  if (!isNaN(n) && String(raw).trim() !== "") return n;
  return null;
}

function statusLabel(row) {
  return String(
    row.sale_status_enum ?? row.sale_status ?? row.status ?? ""
  ).toLowerCase();
}

function isApproved(row) {
  const n = statusNum(row);
  if (n === 2 || n === 8 || n === 10) return true;
  const s = statusLabel(row);
  return (
    s.includes("approv") ||
    s.includes("aprov") ||
    s.includes("complet") ||
    s.includes("authoriz")
  );
}

function isRejectOrCancel(row) {
  const n = statusNum(row);
  if (n === 5 || n === 6) return true;
  const s = statusLabel(row);
  return (
    s.includes("reject") ||
    s.includes("recus") ||
    s.includes("rejeit") ||
    s.includes("cancel")
  );
}

async function fetchPage(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`PerfectPay non-JSON ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      `PerfectPay ${res.status}: ${JSON.stringify(json).slice(0, 400)}`
    );
  }
  const sales = json.sales || {};
  return {
    data: Array.isArray(sales.data) ? sales.data : [],
    lastPage:
      Number(
        sales.total_pages ??
          sales.last_page ??
          sales.lastPage ??
          sales.totalPages ??
          1
      ) || 1,
    totalItems: Number(sales.total_items ?? sales.total ?? 0) || 0,
    currentPage: Number(sales.current_page ?? sales.currentPage ?? 1) || 1,
  };
}

async function fetchRange(start, end) {
  const base = {
    page: 1,
    paginate: 100,
    start_date_sale: start,
    end_date_sale: end,
  };
  const all = [];
  let page = 1;
  let lastPage = 1;
  do {
    base.page = page;
    const { data, lastPage: lp, totalItems } = await fetchPage(base);
    all.push(...data);
    lastPage = lp;
    if (page === 1) {
      console.log(`  total_pages=${lastPage} total_items=${totalItems || "?"}`);
    }
    page += 1;
    if (page > 100) break;
    if (page % 3 === 0 || page > lastPage) {
      console.log(`  fetched page ${page - 1}/${lastPage} (rows=${all.length})`);
    }
  } while (page <= lastPage);
  return all;
}

function customerOf(row) {
  const c = Array.isArray(row.customer)
    ? row.customer[0]
    : row.customer && typeof row.customer === "object"
      ? row.customer
      : {};
  return {
    email: str(c.email || row.email, 120).toLowerCase(),
    name: str(c.full_name || c.name || row.customer_name, 120),
    phone: str(c.phone_number || c.phone || c.whatsapp || row.phone, 40),
  };
}

console.log("mode:", dry ? "DRY-RUN" : "LIVE");
console.log("days:", DAYS);
console.log("token len:", TOKEN.length);
console.log("n8n:", N8N_URL);

if (!TOKEN) {
  console.error("Missing PERFECTPAY_API_TOKEN");
  process.exit(1);
}

const end = dateSP();
const start = addDaysSP(end, -(DAYS - 1));
console.log("range SP:", start, "→", end);

console.log("fetching sales…");
const all = await fetchRange(start, end);
console.log("total sales in range:", all.length);

const byStatus = {};
for (const r of all) {
  const k = String(r.sale_status_enum ?? r.sale_status ?? "?");
  byStatus[k] = (byStatus[k] || 0) + 1;
}
console.log("status counts:", byStatus);

// Per email: did they ever approve? any reject/cancel?
const emailState = new Map(); // email -> { approved, reject, name, phone, code, sale_status }

for (const row of all) {
  const cust = customerOf(row);
  if (!cust.email || !cust.email.includes("@")) continue;
  let st = emailState.get(cust.email);
  if (!st) {
    st = {
      email: cust.email,
      name: cust.name,
      phone: cust.phone,
      approved: false,
      reject: false,
      code: "",
      sale_status: null,
    };
    emailState.set(cust.email, st);
  }
  if (cust.name && !st.name) st.name = cust.name;
  if (cust.phone && !st.phone) st.phone = cust.phone;

  if (isApproved(row)) {
    st.approved = true;
  }
  if (isRejectOrCancel(row)) {
    st.reject = true;
    st.code = str(
      row.transaction_token || row.code || row.transactionToken,
      80
    );
    st.sale_status = row.sale_status_enum ?? row.sale_status;
    if (cust.name) st.name = cust.name;
    if (cust.phone) st.phone = cust.phone;
  }
}

const targets = [...emailState.values()].filter((s) => s.reject && !s.approved);
const skippedPurchased = [...emailState.values()].filter(
  (s) => s.reject && s.approved
);

console.log("emails with reject/cancel:", [...emailState.values()].filter((s) => s.reject).length);
console.log("skipped (later purchased):", skippedPurchased.length);
console.log("TO FIRE (reject/cancel, never approved):", targets.length);

for (const r of targets.slice(0, 40)) {
  console.log(
    " -",
    r.email,
    "|",
    r.name || "-",
    "| status",
    r.sale_status,
    "|",
    r.code
  );
}
if (targets.length > 40) console.log(" ... +" + (targets.length - 40) + " more");

if (dry) {
  console.log("\nDry-run only. Re-run with --live to POST n8n.");
  process.exit(0);
}

if (targets.length === 0) {
  console.log("Nothing to fire.");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const r of targets) {
  try {
    const res = await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: r.email,
        name: r.name,
        phone: r.phone,
        code: r.code,
        sale_status_enum: r.sale_status,
        status: "card_refused",
        source: "backfill_30d",
        purchased: false,
      }),
    });
    const t = await res.text();
    if (res.ok) {
      ok += 1;
      console.log("OK", ok + "/" + targets.length, r.email);
    } else {
      fail += 1;
      console.log("FAIL", r.email, res.status, t.slice(0, 100));
    }
    await new Promise((r) => setTimeout(r, 350));
  } catch (e) {
    fail += 1;
    console.log("ERR", r.email, e.message);
  }
}
console.log("DONE ok=", ok, "fail=", fail, "total=", targets.length);
