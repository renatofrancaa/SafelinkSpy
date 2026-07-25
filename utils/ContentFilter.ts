import { isSuspiciousIP } from "@/utils/IPChecker";
import { cookies, headers } from "next/headers";
import {
  decideLayer,
  REASON_LABELS,
  type LayerDecision,
  cloakerParamPass,
} from "@/utils/cloakerDecision";

export type { LayerDecision };
export { REASON_LABELS, getLayerDecisionFromRequest } from "@/utils/cloakerDecision";

/**
 * Detailed cloaker decision (App Router) — includes VPN check.
 */
export async function getLayerDecision(): Promise<LayerDecision> {
  const cks = await cookies();
  const hdrs = await headers();
  const ip =
    hdrs.get("x-real-ip") ||
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  const url = hdrs.get("x-url") || "";
  const country = (hdrs.get("x-vercel-ip-country") || "US").toUpperCase();
  const userAgent = hdrs.get("user-agent") || hdrs.get("User-Agent") || "";
  const userLanguage = (hdrs.get("accept-language") || "").toLowerCase();

  let params: URLSearchParams;
  try {
    params = url ? new URL(url).searchParams : new URLSearchParams();
  } catch {
    params = new URLSearchParams();
  }

  let isVpn = false;
  try {
    isVpn = await isSuspiciousIP(ip);
  } catch {
    isVpn = false;
  }

  return decideLayer({
    catCookie: cks.get("cat_valid")?.value === "1",
    forceBlack: cks.get("force_black")?.value === "1",
    localParam: params.get("test") || "",
    catInUrl: params.get("cat") === cloakerParamPass,
    userAgent,
    url,
    country,
    language: userLanguage,
    headers: hdrs,
    ip,
    isVpn,
  });
}

/**
 * Layer: 1 = WHITE, 3 = BLACK
 */
export async function getUserLayer(): Promise<number> {
  const d = await getLayerDecision();
  return d.layer;
}
