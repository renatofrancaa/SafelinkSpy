import { NextRequest, NextResponse } from "next/server";

/** Funnel entry (static HTML in /public) */
const FUNNEL_ENTRY = "/index.html";

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

  // Dashboard / API / PWA — untouched
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
    return NextResponse.redirect(dest, { status: 302 });
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest-dashboard\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mp4|webm|woff2?|webmanifest)$).*)",
  ],
};
