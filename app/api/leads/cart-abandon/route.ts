import { NextRequest, NextResponse } from "next/server";
import { notifyN8nCart } from "@/lib/analytics/n8nNotify";

export const dynamic = "force-dynamic";

/**
 * Cart abandon after user starts checkout (step6 unlock / backredirect claim)
 * and may leave PerfectPay without paying. n8n waits ~5 min then emails if not purchased.
 *
 * Body: { email, name, phone?, visitorId?, utmSource?, utmMedium?, utmCampaign? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 200);
    const name = String(body.name || "").trim().slice(0, 120);
    const phone = String(body.phone || "")
      .trim()
      .replace(/^\+/, "")
      .replace(/^=+/, "")
      .slice(0, 40);
    const visitorId = String(body.visitorId || body.visitor_id || "")
      .trim()
      .slice(0, 80);
    const utmSource = String(body.utmSource || body.utm_source || "").slice(
      0,
      80
    );
    const utmMedium = String(body.utmMedium || body.utm_medium || "").slice(
      0,
      80
    );
    const utmCampaign = String(
      body.utmCampaign || body.utm_campaign || ""
    ).slice(0, 120);

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "valid email required" },
        { status: 400 }
      );
    }

    const n8n = await notifyN8nCart({
      email,
      name,
      phone,
      visitorId,
      utmSource,
      utmMedium,
      utmCampaign,
    });

    return NextResponse.json({
      ok: true,
      n8nOk: n8n.ok,
      n8nStatus: n8n.status ?? null,
    });
  } catch (e) {
    console.error("cart-abandon route error", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
