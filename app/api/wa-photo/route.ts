import { NextRequest, NextResponse } from "next/server";

/**
 * WhatsApp profile photo proxy — ZapSpy funnel API (same as funnel_light).
 *
 * GET /api/wa-photo?tel=5511...
 * → { ok, url, blurred, registered, face, name, isBusiness, checkHint }
 *
 * Upstream: https://zapspy-funnel-production.up.railway.app/api/whatsapp-check/{phone}
 * Picture URLs often point at /api/avatar/{phone} on the same host (CORS-safe for <img>).
 */

const ZAPSPY_API =
  process.env.ZAPSPY_API_URL ||
  "https://zapspy-funnel-production.up.railway.app";

const FAKE_PATTERNS = [
  "no-user-image",
  "no_user_image",
  "nouser",
  "default-avatar",
  "default_avatar",
  "placeholder",
  "no-photo",
  "nophoto",
  "anonymous",
  "blank-avatar",
  "ui-avatars.com",
  "via.placeholder",
];

function digitsOnly(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function isRealPhotoUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  const u = url.trim();
  if (!u.startsWith("http")) return false;
  const low = u.toLowerCase();
  return !FAKE_PATTERNS.some((p) => low.includes(p));
}

export async function GET(req: NextRequest) {
  const tel = digitsOnly(req.nextUrl.searchParams.get("tel") || "");
  if (tel.length < 8 || tel.length > 18) {
    return NextResponse.json(
      { ok: false, url: null, blurred: true, error: "invalid_tel" },
      { status: 400 }
    );
  }

  const upstream = `${ZAPSPY_API}/api/whatsapp-check/${encodeURIComponent(tel)}`;

  try {
    const res = await fetch(upstream, {
      cache: "no-store",
      signal: AbortSignal.timeout(35000),
      headers: {
        Accept: "application/json",
        // Same as funnel_light serve-local.js — ZapSpy accepts this origin
        Origin: "https://go.zappdetect.com",
        Referer: "https://go.zappdetect.com/ingles/light/phone.html",
        "User-Agent":
          req.headers.get("user-agent") ||
          "Mozilla/5.0 (compatible; SafelinkSpyPhoto/2.0)",
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          url: null,
          blurred: true,
          error: `upstream_${res.status}`,
          detail: errBody.slice(0, 200) || undefined,
        },
        { status: 200 }
      );
    }

    const data = (await res.json()) as {
      registered?: boolean;
      picture?: string | null;
      name?: string | null;
      about?: string | null;
      isBusiness?: boolean;
      face?: { gender?: string; age?: number } | null;
      checkHint?: string | null;
    };

    let url: string | null = isRealPhotoUrl(data.picture)
      ? String(data.picture).trim()
      : null;

    // Prefer stable avatar proxy on ZapSpy host when picture is missing but check may resolve late
    if (!url && data.registered !== false) {
      const proxyAvatar = `${ZAPSPY_API}/api/avatar/${encodeURIComponent(tel)}`;
      // Only use as candidate — client still validates load; mark as optional
      // Don't set url unless we know it works — keep null so UI shows PROFILE HIDDEN
    }

    return NextResponse.json({
      ok: true,
      url,
      blurred: !url,
      registered: data.registered !== false,
      name: data.name || null,
      about: data.about || null,
      isBusiness: !!data.isBusiness,
      face: data.face || null,
      checkHint: data.checkHint || null,
      avatarProxy: `${ZAPSPY_API}/api/avatar/${encodeURIComponent(tel)}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch_failed";
    return NextResponse.json(
      { ok: false, url: null, blurred: true, error: msg },
      { status: 200 }
    );
  }
}
