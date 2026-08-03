import { NextRequest, NextResponse } from "next/server";

/**
 * Geo for step3 profile card.
 *
 * funnel_light calls ZapSpy /api/geo from the visitor's machine (TCP IP = visitor)
 * so city is precise (e.g. Maricá). From Vercel, ZapSpy only sees the datacenter IP.
 *
 * Fix: use Vercel's visitor geo headers first (x-vercel-ip-city / region),
 * then fall back to IP lookup services with the real client IP.
 */

const BR_REGIONS: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

const US_REGIONS: Record<string, string> = {
  VA: "Virginia",
  CA: "California",
  NY: "New York",
  TX: "Texas",
  FL: "Florida",
};

function decodeHeader(v: string | null): string {
  if (!v) return "";
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v;
  }
}

function regionName(country: string, code: string): string {
  const c = (country || "").toUpperCase();
  const r = (code || "").toUpperCase().replace(/^.*-/, ""); // BR-RJ → RJ
  if (c === "BR" && BR_REGIONS[r]) return BR_REGIONS[r];
  if (c === "US" && US_REGIONS[r]) return US_REGIONS[r];
  return code || "";
}

function clientIp(req: NextRequest): string {
  const candidates = [
    req.headers.get("x-vercel-forwarded-for"),
    req.headers.get("x-forwarded-for"),
    req.headers.get("x-real-ip"),
    req.headers.get("cf-connecting-ip"),
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const first = raw.split(",")[0].trim();
    if (first && first !== "127.0.0.1" && first !== "::1") return first;
  }
  return "";
}

export async function GET(req: NextRequest) {
  // 1) Vercel platform geo (visitor IP — best match for production)
  const vCity = decodeHeader(req.headers.get("x-vercel-ip-city"));
  const vCountry = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const vRegionCode = (
    req.headers.get("x-vercel-ip-country-region") || ""
  ).toUpperCase();
  const vState = regionName(vCountry, vRegionCode);

  if (vCity) {
    return NextResponse.json({
      success: true,
      city: vCity,
      state: vState,
      country:
        vCountry === "BR"
          ? "Brazil"
          : vCountry === "US"
            ? "United States"
            : vCountry,
      country_code: vCountry,
      source: "vercel",
    });
  }

  const ip = clientIp(req);

  // 2) IP lookup services (when Vercel headers missing — e.g. local dev)
  if (ip) {
    try {
      const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) {
        const d = (await r.json()) as {
          success?: boolean;
          city?: string;
          region?: string;
          country?: string;
          country_code?: string;
        };
        if (d?.success !== false && d.city) {
          return NextResponse.json({
            success: true,
            city: d.city,
            state: d.region || "",
            country: d.country || "",
            country_code: d.country_code || "",
            source: "ipwho",
          });
        }
      }
    } catch {
      /* fall through */
    }

    try {
      const r = await fetch(
        `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`,
        { cache: "no-store", signal: AbortSignal.timeout(6000) }
      );
      if (r.ok) {
        const d = (await r.json()) as {
          city?: string;
          region?: string;
          country?: string;
          country_code?: string;
        };
        if (d.city) {
          return NextResponse.json({
            success: true,
            city: d.city,
            state: d.region || "",
            country: d.country || "",
            country_code: d.country_code || "",
            source: "geojs",
          });
        }
      }
    } catch {
      /* fall through */
    }
  }

  // 3) ZapSpy last (from Vercel this is usually the datacenter city — keep as last resort)
  try {
    const r = await fetch(
      `https://zapspy-funnel-production.up.railway.app/api/geo?lang=en`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          Origin: "https://go.zappdetect.com",
          Referer: "https://go.zappdetect.com/ingles/light/phone.html",
          "User-Agent": req.headers.get("user-agent") || "SafelinkSpyGeo/3.0",
          ...(ip
            ? {
                "X-Forwarded-For": ip,
                "X-Real-IP": ip,
              }
            : {}),
        },
      }
    );
    if (r.ok) {
      const d = (await r.json()) as {
        success?: boolean;
        city?: string;
        state?: string;
        country?: string;
        country_code?: string;
      };
      if (d?.success && d.city) {
        return NextResponse.json({
          success: true,
          city: d.city,
          state: d.state || "",
          country: d.country || "",
          country_code: d.country_code || "",
          source: "zapspy",
        });
      }
    }
  } catch {
    /* fall through */
  }

  return NextResponse.json({
    success: false,
    city: "",
    state: "",
    country: "",
    country_code: "",
  });
}
