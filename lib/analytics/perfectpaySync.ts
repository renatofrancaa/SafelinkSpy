/**
 * PerfectPay API sync — import sales from today only (America/Sao_Paulo).
 * Does NOT pull historical sales before today.
 *
 * Docs: POST https://app.perfectpay.com.br/api/v1/sales/get
 * Auth: Authorization: Bearer <PERFECTPAY_API_TOKEN>
 */

import { pushEvent, type AnalyticsEvent } from "@/lib/analytics/store";

const API_BASE = "https://app.perfectpay.com.br/api";

export type SyncResult = {
  ok: boolean;
  day: string;
  fetched: number;
  imported: number;
  skipped: number;
  deduped: number;
  errors: string[];
  byKind: Record<string, number>;
};

function todaySP(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function num(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    return isNaN(n) ? null : n;
  }
  return null;
}

function str(v: unknown, max = 200): string {
  if (v == null) return "";
  return String(v).trim().slice(0, max);
}

/**
 * Map PerfectPay sale_status → event type.
 * IMPORTANT:
 * - cancelled / rejected / pending → ignore (not refunds; never paid or card failed)
 * - refunded → sale_refund
 * - charged_back → sale_chargeback
 * - approved / authorized / completed → sale
 */
function mapKind(
  status: unknown
): "sale" | "sale_refund" | "sale_chargeback" | null {
  if (status == null) return null;
  const s = String(status).toLowerCase().trim();
  const n = Number(s);

  // numeric enums (webhook-compatible)
  if (!isNaN(n) && s !== "" && String(n) === s) {
    if (n === 2 || n === 8 || n === 10) return "sale";
    if (n === 7) return "sale_refund"; // refunded only (NOT cancelled=6)
    if (n === 9) return "sale_chargeback";
    // 1 pending, 5 rejected, 6 cancelled → ignore
    return null;
  }

  if (
    s === "approved" ||
    s === "completed" ||
    s === "authorized" ||
    s === "aprovado" ||
    s === "completo"
  ) {
    return "sale";
  }
  // Real money-back only — never treat cancel/reject as refund
  if (
    s === "refunded" ||
    s === "devolvido" ||
    s === "reembolsado" ||
    s === "reembolso"
  ) {
    return "sale_refund";
  }
  if (
    s === "charged_back" ||
    s === "chargeback" ||
    s === "chargedback"
  ) {
    return "sale_chargeback";
  }
  return null;
}

/**
 * Producer net commission (what you actually earn after gateway fees).
 * PerfectPay API: commissions[].value = $ amount, commissions[].commission = %
 * affiliation_type 1 = producer
 */
function producerCommissionAmount(row: Record<string, unknown>): number | null {
  const list = Array.isArray(row.commissions)
    ? row.commissions
    : Array.isArray(row.commission)
      ? row.commission
      : [];
  let best: number | null = null;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    const type = num(c.affiliation_type ?? c.affiliation_type_enum);
    // Prefer producer (1); accept sole commission if type missing
    const amount =
      num(c.value) ??
      num(c.commission_amount) ??
      num(c.commissionAmount);
    if (amount == null) continue;
    if (type === 1 || type === null) {
      // If percentage-looking (commission field 100 and value is the $)
      best = amount;
      if (type === 1) return amount;
    }
  }
  return best;
}

function currencyFromEnum(v: unknown): string {
  const n = num(v);
  if (n === 1) return "BRL";
  if (n === 2) return "USD";
  if (n === 3) return "EUR";
  return "USD";
}

function parseTs(dateStr: string | null | undefined, fallback: number): number {
  if (!dateStr) return fallback;
  // PerfectPay: "yyyy-mm-dd HH:ii:ss" or ISO
  const raw = dateStr.includes("T")
    ? dateStr
    : dateStr.replace(" ", "T") + (dateStr.includes("-") ? "-03:00" : "");
  const t = Date.parse(raw);
  return isNaN(t) ? fallback : t;
}

type PpSale = Record<string, unknown>;

async function fetchSalesPage(
  token: string,
  body: Record<string, unknown>
): Promise<{ data: PpSale[]; lastPage: number; currentPage: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${API_BASE}/v1/sales/get`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PerfectPay API ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      sales?: {
        data?: PpSale[];
        last_page?: number;
        lastPage?: number;
        current_page?: number;
        currentPage?: number;
      };
    };
    const sales = json.sales || {};
    return {
      data: Array.isArray(sales.data) ? sales.data : [],
      lastPage: Number(sales.last_page ?? sales.lastPage ?? 1) || 1,
      currentPage: Number(sales.current_page ?? sales.currentPage ?? 1) || 1,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch all pages for a given filter (today only). */
async function fetchAllToday(
  token: string,
  dateField: "sale" | "approved" | "updated",
  day: string,
  saleStatus?: string[]
): Promise<PpSale[]> {
  const base: Record<string, unknown> = {
    page: 1,
    paginate: 100,
  };
  if (dateField === "sale") {
    base.start_date_sale = day;
    base.end_date_sale = day;
  } else if (dateField === "approved") {
    base.start_date_approved = day;
    base.end_date_approved = day;
  } else {
    base.start_date_updated = day;
    base.end_date_updated = day;
  }
  if (saleStatus?.length) base.sale_status = saleStatus;

  const all: PpSale[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    base.page = page;
    const result = await fetchSalesPage(token, base);
    all.push(...result.data);
    lastPage = result.lastPage;
    page += 1;
    if (page > 50) break; // safety
  } while (page <= lastPage);

  return all;
}

function firstOfArrayOrObj<T>(v: unknown): T | null {
  if (Array.isArray(v) && v.length) return v[0] as T;
  if (v && typeof v === "object") return v as T;
  return null;
}

function saleToEvent(row: PpSale, now: number): AnalyticsEvent | null {
  const kind = mapKind(row.sale_status ?? row.sale_status_enum);
  if (!kind) return null;

  const orderCode = str(
    row.transaction_token || row.code || row.transactionToken,
    80
  );
  if (!orderCode) return null;

  const productCode = str(row.product_code || row.productCode, 60);
  const productName = str(row.product_name || row.productName, 120);
  const plan = firstOfArrayOrObj<{
    plan_name?: string;
    plan_code?: string;
    planName?: string;
    planCode?: string;
  }>(row.plan);
  const planName = str(plan?.plan_name || plan?.planName, 120);
  const planCode = str(plan?.plan_code || plan?.planCode, 60);
  const customer = firstOfArrayOrObj<{
    full_name?: string;
    email?: string;
    country?: string;
  }>(row.customer);
  const metadata = (row.metadata && typeof row.metadata === "object"
    ? row.metadata
    : {}) as Record<string, unknown>;

  // Customer paid (list/checkout price)
  const saleAmount =
    num(row.value) ?? num(row.sale_amount) ?? num(row.unit_value) ?? 0;
  // What producer receives after PerfectPay fees (matches PerfectPay "comissão")
  const commissionAmount = producerCommissionAmount(row);
  // Faturamento no painel = comissão líquida quando disponível
  const revenueAmount =
    commissionAmount != null && commissionAmount > 0
      ? commissionAmount
      : saleAmount;
  const paymentType = num(row.payment_type ?? row.payment_type_enum);
  const isUpsell = paymentType === 6;

  const utmSource = str(metadata.utm_source || metadata.utmSource, 80);
  const utmMedium = str(metadata.utm_medium || metadata.utmMedium, 80);
  const utmCampaign = str(metadata.utm_campaign || metadata.utmCampaign, 120);
  const src = str(metadata.src || metadata.zs_vid || metadata.zsVid, 80);

  let visitorId = "";
  if (src && (src.startsWith("v_") || src.length >= 8)) {
    visitorId = src.slice(0, 80);
  } else {
    const email = str(customer?.email, 120).toLowerCase();
    visitorId = email
      ? `email_${email.replace(/[^a-z0-9@._-]/g, "").slice(0, 60)}`
      : `pp_${orderCode}`;
  }

  const planLabel =
    planName || productName || (saleAmount ? `$${saleAmount}` : orderCode);

  let stage = "checkout";
  const planMeta = str(metadata.plan || metadata.upsell || metadata.tier, 20).toLowerCase();
  if (/^up[1-7]$/.test(planMeta)) stage = `upsell${planMeta.slice(2)}`;
  else if (isUpsell) stage = "upsell";

  const reasonMap = {
    sale: {
      reason: "sale_approved",
      label: "Venda aprovada (API PerfectPay)",
    },
    sale_refund: {
      reason: "sale_refunded",
      label: "Reembolso (API PerfectPay)",
    },
    sale_chargeback: {
      reason: "sale_chargeback",
      label: "Chargeback (API PerfectPay)",
    },
  } as const;
  const { reason, label: reasonLabel } = reasonMap[kind];

  const dateApproved = str(row.date_approved || row.dateApproved, 40);
  const dateCreated = str(row.date_created || row.dateCreated, 40);
  const ts = parseTs(dateApproved || dateCreated, now);

  const signedAmount =
    kind === "sale" ? revenueAmount : -Math.abs(revenueAmount);

  return {
    id: `${kind}_${orderCode}_api`,
    type: kind,
    visitorId,
    page: `/api/perfectpay-sync/${orderCode}`,
    stage,
    layer: "black",
    source: utmSource || str(metadata.src, 80) || "perfectpay",
    landing: "",
    utmSource,
    utmMedium,
    utmCampaign,
    country: str(customer?.country, 8).toUpperCase(),
    domain: "perfectpay-api",
    ip: "",
    device: "API Sync",
    reason,
    reasonLabel,
    isBot: false,
    hasParam: !!utmSource,
    meta: {
      orderCode,
      saleCode: orderCode,
      code: productCode || orderCode,
      productCode,
      productName,
      planCode,
      planName,
      planLabel,
      // Primary amount for dashboard faturamento = comissão líquida
      value: revenueAmount,
      saleAmount,
      commissionAmount: commissionAmount ?? null,
      listPrice: saleAmount,
      signedAmount,
      kind,
      eventType: kind,
      currency: currencyFromEnum(row.currency_enum ?? row.currencyEnum),
      paymentType,
      saleStatus: row.sale_status ?? row.sale_status_enum ?? null,
      isUpsell,
      isAdjustment: kind !== "sale",
      customerEmail: str(customer?.email, 120),
      customerName: str(customer?.full_name, 120),
      placement: str(metadata.utm_content || metadata.placement, 120),
      utmContent: str(metadata.utm_content, 120),
      dateApproved: dateApproved || null,
      dateCreated: dateCreated || null,
      source: "perfectpay_api_sync",
      importedFrom: "api",
      daySP: todaySP(),
    },
    ts,
  };
}

/**
 * Import PerfectPay sales for **today only** (Sao Paulo calendar).
 * Merges: created today + approved today + refunds/chargebacks updated today.
 * Dedupes by order code via pushEvent unique keys.
 */
export async function syncPerfectPayToday(): Promise<SyncResult> {
  const token = process.env.PERFECTPAY_API_TOKEN || "";
  const day = todaySP();
  const result: SyncResult = {
    ok: false,
    day,
    fetched: 0,
    imported: 0,
    skipped: 0,
    deduped: 0,
    errors: [],
    byKind: {},
  };

  if (!token) {
    result.errors.push("PERFECTPAY_API_TOKEN not configured");
    return result;
  }

  try {
    // ONLY sales created today (no historical pull).
    // date_created in America/Sao_Paulo window via PerfectPay start/end_date_sale.
    const bySale = await fetchAllToday(token, "sale", day);

    // Merge unique by transaction_token
    const map = new Map<string, PpSale>();
    for (const row of bySale) {
      const key = str(
        row.transaction_token || row.code || row.transactionToken,
        80
      );
      if (!key) continue;
      const prev = map.get(key);
      if (!prev || (row.product_name && !prev.product_name)) {
        map.set(key, row);
      }
    }

    const rows = Array.from(map.values());
    result.fetched = rows.length;
    const now = Date.now();

    for (const row of rows) {
      try {
        const ev = saleToEvent(row, now);
        if (!ev) {
          result.skipped += 1;
          continue;
        }
        // Safety: only keep events dated today in SP (or adjustments from updated filter)
        const dayOf = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(ev.ts));
        const isAdjustment = ev.type !== "sale";
        if (!isAdjustment && dayOf < day) {
          // strictly no previous sales
          result.skipped += 1;
          continue;
        }

        const pushed = await pushEvent(ev);
        if (pushed.deduped) {
          result.deduped += 1;
        } else if (pushed.ok) {
          result.imported += 1;
          result.byKind[ev.type] = (result.byKind[ev.type] || 0) + 1;
        } else {
          result.errors.push(pushed.error || "push failed");
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    result.ok = result.errors.length === 0 || result.imported + result.deduped > 0;
    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }
}

/** In-memory throttle for auto-sync from stats polling */
const g = globalThis as unknown as { __zsPpSyncAt?: number };
const AUTO_SYNC_MS = 3 * 60 * 1000;

export async function maybeAutoSyncPerfectPay(): Promise<SyncResult | null> {
  if (!process.env.PERFECTPAY_API_TOKEN) return null;
  const now = Date.now();
  if (g.__zsPpSyncAt && now - g.__zsPpSyncAt < AUTO_SYNC_MS) return null;
  g.__zsPpSyncAt = now;
  return syncPerfectPayToday();
}
