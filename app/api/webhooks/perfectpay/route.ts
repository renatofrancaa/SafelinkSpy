import { NextRequest, NextResponse } from "next/server";
import {
  pushEvent,
  getEventsInRange,
  type AnalyticsEvent,
} from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

/**
 * PerfectPay / CenterPag postback webhook.
 *
 * Primary domain (always use this):
 *   https://safelinkspy.vercel.app/api/webhooks/perfectpay
 *
 * Configure in PerfectPay (recommended events for exact net revenue):
 *   - Aprovado (2) / Autorizado (8) / Completo (10) → +faturamento
 *   - Devolvido / Reembolsado (7) → -faturamento
 *   - Charged back (9) → -faturamento
 *   - Cancelado (6) → -faturamento se já havia venda
 * Optional: PERFECTPAY_WEBHOOK_TOKEN = token do webhook
 *
 * sale_status_enum:
 *   2 approved, 6 cancelled, 7 refunded, 8 authorized, 9 charged_back, 10 completed
 */

/** Canonical production host for webhooks / docs (not custom ad domains) */
const PRIMARY_HOST = "safelinkspy.vercel.app";
const PERFECTPAY_WEBHOOK_URL = `https://${PRIMARY_HOST}/api/webhooks/perfectpay`;

/** Adds to gross revenue */
const APPROVED_STATUSES = new Set([2, 8, 10]);
/** Subtracts from net revenue — real refund only (not cancelled/rejected) */
const REFUND_STATUSES = new Set([7]); // refunded
const CHARGEBACK_STATUSES = new Set([9]); // charged_back
// Cancelled (6) / rejected (5) / pending (1) → ignore (no money moved as refund)

type SaleKind = "sale" | "sale_refund" | "sale_chargeback" | "sale_rejected";

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

function pickMeta(meta: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!meta || typeof meta !== "object") return "";
  for (const k of keys) {
    const v = str(meta[k], 120);
    if (v) return v;
  }
  return "";
}

function extractVisitorId(body: Record<string, unknown>): string {
  const meta = (body.metadata && typeof body.metadata === "object"
    ? body.metadata
    : {}) as Record<string, unknown>;

  // Prefer explicit ids we pass on checkout URLs (src / zs_vid)
  const fromMeta = pickMeta(meta, [
    "zs_vid",
    "zsVid",
    "visitor_id",
    "visitorId",
    "src",
    "sck",
    "xcod",
  ]);
  if (fromMeta && (fromMeta.startsWith("v_") || fromMeta.length >= 8)) {
    return fromMeta.slice(0, 80);
  }

  // Fallback: email-based synthetic id (still unique enough for dashboards)
  const customer = (body.customer && typeof body.customer === "object"
    ? body.customer
    : {}) as Record<string, unknown>;
  const email = str(customer.email, 120).toLowerCase();
  if (email && email.includes("@")) {
    return `email_${email.replace(/[^a-z0-9@._-]/g, "").slice(0, 60)}`;
  }

  const order = str(body.code, 40);
  if (order) return `pp_${order}`;
  return `pp_unknown_${Date.now()}`;
}

async function enrichFromHistory(
  visitorId: string,
  productCode: string
): Promise<{
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  source: string;
  country: string;
  landing: string;
  page: string;
}> {
  const empty = {
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    source: "perfectpay",
    country: "",
    landing: "",
    page: "",
  };
  try {
    // Look back 30 days for matching visitor / product checkout
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const events = await getEventsInRange(since, Date.now(), 5_000);
    const mine = events.filter((e) => e.visitorId === visitorId);
    // Prefer checkout_click for this product
    const productHit = mine.find((e) => {
      if (e.type !== "checkout_click") return false;
      const code = String(e.meta?.code || e.meta?.productCode || "");
      return productCode && code && code === productCode;
    });
    const any = productHit || mine[0];
    if (!any) return empty;
    return {
      utmSource: any.utmSource || "",
      utmMedium: any.utmMedium || "",
      utmCampaign: any.utmCampaign || "",
      source: any.utmSource || any.source || "perfectpay",
      country: any.country || "",
      landing: any.landing || "",
      page: any.page || "",
    };
  } catch {
    return empty;
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      body = (await req.json()) as Record<string, unknown>;
    } else if (
      ct.includes("application/x-www-form-urlencoded") ||
      ct.includes("multipart/form-data")
    ) {
      const form = await req.formData();
      const raw = form.get("data") || form.get("payload") || form.get("json");
      if (typeof raw === "string") {
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          body = Object.fromEntries(form.entries()) as Record<string, unknown>;
        }
      } else {
        body = Object.fromEntries(form.entries()) as Record<string, unknown>;
        // Nested JSON fields sometimes come as strings
        for (const k of Object.keys(body)) {
          const v = body[k];
          if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
            try {
              body[k] = JSON.parse(v);
            } catch {
              /* keep */
            }
          }
        }
      }
    } else {
      // Try JSON first, then text
      const text = await req.text();
      try {
        body = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "invalid body" }, { status: 400 });
      }
    }

    // Optional token gate (PerfectPay body.token or query ?token=)
    const expected = process.env.PERFECTPAY_WEBHOOK_TOKEN || "";
    if (expected) {
      const got =
        str(body.token, 64) ||
        req.nextUrl.searchParams.get("token") ||
        req.headers.get("x-perfectpay-token") ||
        "";
      if (got !== expected) {
        return NextResponse.json({ error: "invalid token" }, { status: 401 });
      }
    }

    const statusEnum = num(body.sale_status_enum);
    const statusDetail = str(body.sale_status_detail, 80).toLowerCase();

    function resolveKind(): SaleKind | null {
      if (
        (statusEnum != null && APPROVED_STATUSES.has(statusEnum)) ||
        statusDetail === "approved" ||
        statusDetail === "completed" ||
        statusDetail === "authorized"
      ) {
        return "sale";
      }
      if (
        (statusEnum != null && REFUND_STATUSES.has(statusEnum)) ||
        statusDetail.includes("refund") ||
        statusDetail.includes("devolvido") ||
        statusDetail.includes("reembolso")
      ) {
        return "sale_refund";
      }
      if (
        (statusEnum != null && CHARGEBACK_STATUSES.has(statusEnum)) ||
        statusDetail === "charged_back" ||
        statusDetail === "chargeback"
      ) {
        return "sale_chargeback";
      }
      if (
        statusEnum === 5 ||
        statusDetail === "rejected" ||
        statusDetail === "rejeitado" ||
        statusDetail === "recusado"
      ) {
        return "sale_rejected";
      }
      // cancelled / pending → ignore
      return null;
    }

    const kind = resolveKind();

    // Ack ignored statuses so PerfectPay does not retry forever
    // (pending, billet waiting, precheckout, etc.)
    if (!kind) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "status_not_tracked",
        sale_status_enum: statusEnum,
        sale_status_detail: statusDetail,
      });
    }

    const orderCode = str(body.code, 80);
    if (!orderCode) {
      return NextResponse.json({ error: "missing sale code" }, { status: 400 });
    }

    const product = (body.product && typeof body.product === "object"
      ? body.product
      : {}) as Record<string, unknown>;
    const plan = (body.plan && typeof body.plan === "object"
      ? body.plan
      : {}) as Record<string, unknown>;
    const customer = (body.customer && typeof body.customer === "object"
      ? body.customer
      : {}) as Record<string, unknown>;
    const metadata = (body.metadata && typeof body.metadata === "object"
      ? body.metadata
      : {}) as Record<string, unknown>;

    const productCode = str(product.code, 60);
    const productName = str(product.name || plan.name, 120);
    const planCode = str(plan.code, 60);
    const planName = str(plan.name, 120);
    const saleAmount = num(body.sale_amount);
    // Producer commission after fees (matches PerfectPay "comissão")
    let commissionAmount: number | null = null;
    const commissions = Array.isArray(body.commission)
      ? body.commission
      : Array.isArray(body.commissions)
        ? body.commissions
        : [];
    for (const raw of commissions) {
      if (!raw || typeof raw !== "object") continue;
      const c = raw as Record<string, unknown>;
      const type = num(c.affiliation_type_enum ?? c.affiliation_type);
      const amount =
        num(c.commission_amount) ?? num(c.value) ?? num(c.commissionAmount);
      if (amount == null) continue;
      if (type === 1 || type === null) {
        commissionAmount = amount;
        if (type === 1) break;
      }
    }
    // Faturamento = só comissão líquida (sem taxa PerfectPay). Sem comissão → 0.
    const revenueAmount =
      commissionAmount != null && commissionAmount > 0
        ? commissionAmount
        : 0;
    const paymentType = num(body.payment_type_enum);
    const isUpsellPayment = paymentType === 6; // credit_card_upsell

    const visitorId = extractVisitorId(body);
    const metaUtmSource = pickMeta(metadata, ["utm_source", "utmSource"]);
    const metaUtmMedium = pickMeta(metadata, ["utm_medium", "utmMedium"]);
    const metaUtmCampaign = pickMeta(metadata, ["utm_campaign", "utmCampaign"]);
    const metaUtmContent = pickMeta(metadata, ["utm_content", "utmContent"]);
    const metaPlacement = pickMeta(metadata, [
      "placement",
      "utm_placement",
      "utm_content",
    ]);

    const hist = await enrichFromHistory(visitorId, productCode);

    const utmSource = metaUtmSource || hist.utmSource || "";
    const utmMedium = metaUtmMedium || hist.utmMedium || "";
    const utmCampaign = metaUtmCampaign || hist.utmCampaign || "";
    const source = utmSource || hist.source || "perfectpay";
    const country =
      str(customer.country, 8).toUpperCase() || hist.country || "";

    let tier = pickMeta(metadata, ["plan", "tier", "upsell"]) || "";
    if (!tier && productCode && isUpsellPayment) tier = "upsell";
    const planLabel =
      planName ||
      productName ||
      (saleAmount != null ? `$${saleAmount}` : orderCode);

    let stage = "checkout";
    const planMeta = pickMeta(metadata, ["plan", "upsell", "tier"]).toLowerCase();
    if (/^up[1-7]$/.test(planMeta)) stage = `upsell${planMeta.slice(2)}`;
    else if (planMeta.startsWith("upsell") && /[1-7]/.test(planMeta)) {
      const m = planMeta.match(/([1-7])/);
      if (m) stage = `upsell${m[1]}`;
    } else if (isUpsellPayment) stage = "upsell";

    const ts = Date.now();
    const approvedAt = str(body.date_approved, 40);

    const eventType = kind;

    const reasonMap: Record<SaleKind, { reason: string; label: string }> = {
      sale: {
        reason: "sale_approved",
        label: "Venda aprovada (PerfectPay)",
      },
      sale_refund: {
        reason: "sale_refunded",
        label: "Reembolso (PerfectPay)",
      },
      sale_chargeback: {
        reason: "sale_chargeback",
        label: "Chargeback (PerfectPay)",
      },
      sale_rejected: {
        reason: "sale_rejected",
        label: "Pagamento rejeitado (PerfectPay)",
      },
    };
    const { reason, label: reasonLabel } = reasonMap[kind];

    // Faturamento = comissão líquida (producer) when available; rejected = $0 revenue
    const signedAmount =
      eventType === "sale"
        ? revenueAmount
        : eventType === "sale_rejected"
          ? 0
          : -Math.abs(revenueAmount);

    // Upsell detection (plan / payment_type 6 / PPU codes)
    const planMetaWh = pickMeta(metadata, ["plan", "upsell", "tier"]).toLowerCase();
    const isUpsellWh =
      isUpsellPayment ||
      /^up[1-7]$/i.test(planMetaWh) ||
      /up\s*[1-7]/i.test(planName) ||
      productCode.toUpperCase().startsWith("PPU");
    if (isUpsellWh && /^up[1-7]$/i.test(planMetaWh)) {
      stage = `upsell${planMetaWh.replace(/\D/g, "")}`;
    } else if (isUpsellWh && /up\s*([1-7])/i.test(planName)) {
      const m = planName.match(/up\s*([1-7])/i);
      if (m) stage = `upsell${m[1]}`;
    }

    const ev: AnalyticsEvent = {
      id: `${eventType}_${orderCode}_${ts.toString(36)}`,
      type: eventType,
      visitorId,
      page: hist.page || `/webhook/perfectpay/${orderCode}`,
      stage,
      layer: "black",
      source,
      landing: hist.landing || "",
      utmSource,
      utmMedium,
      utmCampaign,
      country,
      domain: req.headers.get("host") || "",
      ip: "",
      device: "Webhook",
      reason,
      reasonLabel,
      isBot: false,
      hasParam: !!(utmSource || metaUtmContent),
      meta: {
        orderCode,
        saleCode: orderCode,
        code: productCode || orderCode,
        productCode,
        productName,
        planCode,
        planName,
        planLabel,
        value: eventType === "sale_rejected" ? 0 : revenueAmount,
        valueIsCommission: true,
        saleAmount,
        commissionAmount,
        listPrice: saleAmount,
        platformFee:
          saleAmount != null &&
          revenueAmount > 0 &&
          saleAmount > revenueAmount
            ? Math.round((saleAmount - revenueAmount) * 100) / 100
            : null,
        signedAmount,
        kind,
        eventType,
        tier: tier || planMetaWh || null,
        currency: num(body.currency_enum) === 1 ? "BRL" : "USD",
        paymentType,
        paymentMethod: num(body.payment_method_enum),
        saleStatus: statusEnum,
        saleStatusDetail: statusDetail,
        isUpsell: isUpsellWh,
        isAdjustment:
          eventType === "sale_refund" || eventType === "sale_chargeback",
        countsAsRevenue: eventType === "sale",
        customerEmail: str(customer.email, 120),
        customerName: str(customer.full_name, 120),
        placement: metaPlacement || metaUtmContent || "",
        utmContent: metaUtmContent,
        dateApproved: approvedAt || null,
        dateCreated: str(body.date_created, 40) || null,
        source: "perfectpay_webhook",
      },
      ts,
    };

    const result = await pushEvent(ev);

    return NextResponse.json({
      ok: true,
      kind,
      eventType,
      orderCode,
      visitorId,
      amount: revenueAmount,
      saleAmount,
      commissionAmount,
      signedAmount,
      deduped: !!result.deduped,
      pushed: result.ok,
    });
  } catch (e) {
    console.error("perfectpay webhook error", e);
    return NextResponse.json({ error: "webhook failed" }, { status: 500 });
  }
}

/** Health check for PerfectPay test / browser open */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: PERFECTPAY_WEBHOOK_URL,
    primaryHost: PRIMARY_HOST,
    path: "/api/webhooks/perfectpay",
    recommendedEvents: [
      "Aprovado",
      "Autorizado",
      "Completo",
      "Devolvido / Reembolsado",
      "Charged back",
      "Cancelado",
    ],
    hint: `Configure ${PERFECTPAY_WEBHOOK_URL} in PerfectPay with Aprovado + Reembolso + Chargeback for exact net revenue.`,
  });
}
