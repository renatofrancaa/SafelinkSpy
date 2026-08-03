import { NextRequest, NextResponse } from "next/server";

/**
 * Branded checkout redirect (email recovery / ads).
 *
 * Example:
 *   /go/PPU38CQEHD1?name=Ana&email=a@b.com&phone=1&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e1
 * → 302 https://go.centerpag.com/PPU38CQEHD1?name=...&email=... (all query params kept)
 *
 * Use the SAME domain as Resend From (e.g. https://mysafelinkspy.com/go/...)
 * so Resend "link URLs match sending domain" stays green.
 */

const CENTERPAG_BASE = "https://go.centerpag.com";

/** Only allow known-looking CenterPag product codes (alphanumeric, short). */
const CODE_RE = /^[A-Za-z0-9]{6,32}$/;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await ctx.params;
  const code = decodeURIComponent(raw || "").trim();

  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "invalid checkout code" }, { status: 400 });
  }

  const incoming = req.nextUrl.searchParams;
  const out = new URL(`${CENTERPAG_BASE}/${code}`);

  // Preserve every query param (name, email, phone, plan, utm_*, fbclid, etc.)
  incoming.forEach((value, key) => {
    if (key === "code") return;
    out.searchParams.append(key, value);
  });

  return NextResponse.redirect(out.toString(), {
    status: 302,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
