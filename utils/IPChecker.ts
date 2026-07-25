const PROXYCHECK_API_KEY = process.env.PROXYCHECK_API_KEY || "";
const ABSTRACT_API_KEY = process.env.ABSTRACT_API_KEY || "";
const IPINFO_API_KEY = process.env.IPINFO_API_KEY || "";

// Countries that always get WHITE (safe) content
const blockedCountryList = (process.env.CLOAKER_BLOCKED_COUNTRIES || "BR,RU,KP,IR")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

export async function isSuspiciousIP(ip: string): Promise<boolean> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return false;

  try {
    // PROXYCHECK
    if (PROXYCHECK_API_KEY) {
      const proxyCheckResponse = await fetch(
        `https://proxycheck.io/v2/${ip}?key=${PROXYCHECK_API_KEY}&vpn=1&asn=1`,
        { next: { revalidate: 0 } }
      );
      const proxyCheckData = await proxyCheckResponse.json();

      if (
        proxyCheckData[ip]?.proxy === "yes" ||
        proxyCheckData[ip]?.vpn === "yes"
      ) {
        return true;
      }

      const proxyCheckCountry = proxyCheckData[ip]?.isocode;
      if (proxyCheckCountry && blockedCountryList.includes(proxyCheckCountry)) {
        return true;
      }
    }

    // ABSTRACT
    if (ABSTRACT_API_KEY) {
      const abstractResponse = await fetch(
        `https://ip-intelligence.abstractapi.com/v1/?api_key=${ABSTRACT_API_KEY}&ip_address=${ip}`,
        { next: { revalidate: 0 } }
      );
      const abstractData = await abstractResponse.json();

      if (
        abstractData?.security?.is_vpn ||
        abstractData?.security?.is_proxy ||
        abstractData?.security?.is_tor
      ) {
        return true;
      }

      const abstractCountry = abstractData?.location?.country_code;
      if (abstractCountry && blockedCountryList.includes(abstractCountry)) {
        return true;
      }
    }

    // IPINFO (datacenter)
    if (IPINFO_API_KEY) {
      const ipInfoResponse = await fetch(
        `https://ipinfo.io/${ip}/json?token=${IPINFO_API_KEY}`,
        { next: { revalidate: 0 } }
      );
      const ipInfoData = await ipInfoResponse.json();
      const asn = ipInfoData?.org || "";

      if (
        asn.includes("Amazon") ||
        asn.includes("Google") ||
        asn.includes("Microsoft") ||
        asn.includes("DigitalOcean")
      ) {
        return true;
      }

      const ipinfoCountry = ipInfoData?.country;
      if (ipinfoCountry && blockedCountryList.includes(ipinfoCountry)) {
        return true;
      }
    }
  } catch (error) {
    console.error("IPChecker error:", error);
    // Fail open for availability (same spirit as rew-meta catch → false)
    return false;
  }

  return false;
}
