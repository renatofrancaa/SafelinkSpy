import { NextRequest, NextResponse } from "next/server";

/** Funnel entry (static HTML in /public) */
const FUNNEL_ENTRY = "/index.html";

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

function decodeHdr(v: string | null): string {
  if (!v) return "";
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v;
  }
}

/** Persist visitor city/state from Vercel edge geo (real client IP). */
function attachGeoCookie(req: NextRequest, res: NextResponse) {
  const city = decodeHdr(req.headers.get("x-vercel-ip-city"));
  if (!city) return res;
  const country = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const regionCode = (
    req.headers.get("x-vercel-ip-country-region") || ""
  ).toUpperCase();
  const code = regionCode.replace(/^.*-/, "");
  const state =
    country === "BR" && BR_REGIONS[code]
      ? BR_REGIONS[code]
      : regionCode || "";
  const payload = JSON.stringify({
    success: true,
    city,
    state,
    country:
      country === "BR" ? "Brazil" : country === "US" ? "United States" : country,
    country_code: country,
    source: "vercel-middleware",
  });
  res.cookies.set("sl_geo", payload, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
  return res;
}

/**
 * Lightweight middleware — no cloaker.
 * Passes traffic through; root redirects to the funnel entry.
 */
export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-url", nextUrl.toString());
  requestHeaders.set("x-host", nextUrl.hostname.toLowerCase());

  const searchParams = nextUrl.searchParams;
  const gclid = searchParams.get("gclid");
  const wbraid = searchParams.get("wbraid");
  const gbraid = searchParams.get("gbraid");
  const gadSource = searchParams.get("gad_source");
  if (gclid) requestHeaders.set("x-gclid", gclid);
  if (wbraid) requestHeaders.set("x-wbraid", wbraid);
  if (gbraid) requestHeaders.set("x-gbraid", gbraid);
  if (gadSource) requestHeaders.set("x-gad-source", gadSource);

  // Dashboard / API / PWA — untouched (API has its own geo)
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest-dashboard.webmanifest"
  ) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Root → funnel (keeps query string: UTMs, fbclid, etc.)
  if (pathname === "/" || pathname === "") {
    const dest = nextUrl.clone();
    dest.pathname = FUNNEL_ENTRY;
    const redir = NextResponse.redirect(dest, { status: 302 });
    return attachGeoCookie(req, redir);
  }

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return attachGeoCookie(req, res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest-dashboard\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mp4|webm|woff2?|webmanifest)$).*)",
  ],
};
