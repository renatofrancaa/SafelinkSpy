/**
 * Best-effort notify n8n webhooks
 * (lead recovery / purchase / card cancel / cart abandon).
 * Never throws to the caller — failures are logged only.
 */

function n8nHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const secret = process.env.N8N_WEBHOOK_SECRET || "";
  if (secret) headers["x-webhook-secret"] = secret;
  return headers;
}

export async function notifyN8nPurchase(payload: {
  email: string;
  name?: string;
  phone?: string;
  orderCode?: string;
  amount?: number | null;
  productName?: string;
  status?: string;
}): Promise<{ ok: boolean; status?: number; welcomeOk?: boolean }> {
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return { ok: false };

  const body = {
    email,
    name: payload.name || "",
    phone: payload.phone || "",
    order_code: payload.orderCode || "",
    amount: payload.amount ?? null,
    product_name: payload.productName || "",
    status: payload.status || "purchased",
    purchased: true,
    event: "purchase_confirmed",
    ts: Date.now(),
    source: "perfectpay",
  };

  // 1) Mark purchased (skip recovery / cart / cancel sequences)
  const purchaseUrl = (process.env.N8N_PURCHASE_WEBHOOK_URL || "").trim();
  let purchaseOk = false;
  let purchaseStatus: number | undefined;
  if (purchaseUrl) {
    try {
      const res = await fetch(purchaseUrl, {
        method: "POST",
        headers: n8nHeaders(),
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      purchaseOk = res.ok;
      purchaseStatus = res.status;
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error(
          "n8n purchase webhook failed",
          res.status,
          t.slice(0, 200)
        );
      }
    } catch (e) {
      console.error("n8n purchase webhook error", e);
    }
  }

  // 2) Welcome 5-email sequence (buyers only)
  const welcomeUrl = (process.env.N8N_WELCOME_WEBHOOK_URL || "").trim();
  let welcomeOk = false;
  if (welcomeUrl) {
    try {
      const res = await fetch(welcomeUrl, {
        method: "POST",
        headers: n8nHeaders(),
        body: JSON.stringify({
          ...body,
          event: "purchase_welcome",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      welcomeOk = res.ok;
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error(
          "n8n welcome webhook failed",
          res.status,
          t.slice(0, 200)
        );
      }
    } catch (e) {
      console.error("n8n welcome webhook error", e);
    }
  }

  return {
    ok: purchaseOk || welcomeOk,
    status: purchaseStatus,
    welcomeOk,
  };
}

/**
 * Card refused / order cancelled → start 7-email cancel recovery on n8n.
 * Env: N8N_CANCEL_WEBHOOK_URL
 */
export async function notifyN8nCancel(payload: {
  email: string;
  name?: string;
  phone?: string;
  orderCode?: string;
  saleStatus?: string | number | null;
  productName?: string;
  status?: string;
}): Promise<{ ok: boolean; status?: number }> {
  const url = (process.env.N8N_CANCEL_WEBHOOK_URL || "").trim();
  if (!url) return { ok: false };

  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return { ok: false };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: n8nHeaders(),
      body: JSON.stringify({
        email,
        name: payload.name || "",
        phone: payload.phone || "",
        code: payload.orderCode || "",
        order_code: payload.orderCode || "",
        sale_status_enum: payload.saleStatus ?? null,
        product_name: payload.productName || "",
        status: payload.status || "card_refused",
        purchased: false,
        event: "order_cancelled",
        ts: Date.now(),
        source: "perfectpay",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("n8n cancel webhook failed", res.status, t.slice(0, 200));
    }
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error("n8n cancel webhook error", e);
    return { ok: false };
  }
}

/**
 * Cart abandon: user clicked checkout (InitiateCheckout) then may leave without paying.
 * Env: N8N_CART_WEBHOOK_URL
 */
export async function notifyN8nCart(payload: {
  email: string;
  name?: string;
  phone?: string;
  visitorId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}): Promise<{ ok: boolean; status?: number }> {
  const url = (process.env.N8N_CART_WEBHOOK_URL || "").trim();
  if (!url) return { ok: false };

  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return { ok: false };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: n8nHeaders(),
      body: JSON.stringify({
        email,
        name: payload.name || "",
        phone: payload.phone || "",
        visitor_id: payload.visitorId || "",
        utm_source: payload.utmSource || "",
        utm_medium: payload.utmMedium || "cart_abandon",
        utm_campaign: payload.utmCampaign || "cart_abandoned_7",
        status: "cart_abandoned",
        purchased: false,
        event: "cart_abandoned",
        ts: Date.now(),
        source: "funnel_step6",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("n8n cart webhook failed", res.status, t.slice(0, 200));
    }
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error("n8n cart webhook error", e);
    return { ok: false };
  }
}
