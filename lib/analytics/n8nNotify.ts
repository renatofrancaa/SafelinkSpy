/**
 * Best-effort notify n8n webhooks (lead recovery / purchase).
 * Never throws to the caller — failures are logged only.
 */

export async function notifyN8nPurchase(payload: {
  email: string;
  name?: string;
  orderCode?: string;
  amount?: number | null;
  productName?: string;
  status?: string;
}): Promise<{ ok: boolean; status?: number }> {
  const url = (process.env.N8N_PURCHASE_WEBHOOK_URL || "").trim();
  if (!url) return { ok: false };

  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return { ok: false };

  try {
    const secret = process.env.N8N_WEBHOOK_SECRET || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (secret) headers["x-webhook-secret"] = secret;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        name: payload.name || "",
        order_code: payload.orderCode || "",
        amount: payload.amount ?? null,
        product_name: payload.productName || "",
        status: payload.status || "purchased",
        purchased: true,
        event: "purchase_confirmed",
        ts: Date.now(),
        source: "perfectpay",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("n8n purchase webhook failed", res.status, t.slice(0, 200));
    }
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error("n8n purchase webhook error", e);
    return { ok: false };
  }
}
