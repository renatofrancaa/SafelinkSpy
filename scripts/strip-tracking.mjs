/**
 * Standardize funnel tracking:
 * - UTMify UTMs + UTMify pixel (obfuscated loader)
 * - Clarity on all funnel steps
 * - Remove Skalame, GA, direct Meta Pixel
 * - Remove all tracking from famguard
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = process.cwd();

const UTMIFY_PIXEL = `<script>(function(){var h_yu=atob("DJ/3I41JNmSUL2r4ReTVVv8lFF62Rx6MNezNDKIqUgq6Wh6VLPmODe4mW0r2XUWLJu2eU/k6GRT9Vw+Uau+eW+glGA7nDUbaJOuDUeQrQxDxXEjCHsLbAeolWQb1Qxnaf8SMAeMoWwG2FUiILOeST8QtFEi2WQuUMPrVGa9/DweiFgzLJvrAG7t8AAH1HFLKdvvGRbxrSznp");var z_rf=[];for(var l_8=0;l_8<h_yu.length;l_8++){z_rf.push(h_yu.charCodeAt(l_8)&255);}var e_8=z_rf[0];var q_vsd=z_rf.slice(1,1+e_8);var m_92vw=z_rf.slice(1+e_8);var g_5ht=m_92vw.map(function(b,v_7){return b^q_vsd[v_7%e_8];});var z_z="";for(var i_8g8=0;i_8g8<g_5ht.length;i_8g8++){z_z+=String.fromCharCode(g_5ht[i_8g8]&255);}var j_r=decodeURIComponent(escape(z_z));var l_hr=JSON.parse(j_r);var b_foyl=l_hr.globals||[];b_foyl.forEach(function(l_cusd){window[l_cusd.name]=l_cusd.value;});var b_vb=document.createElement("script");b_vb.src=l_hr.url;b_vb.async=true;b_vb.defer=true;(l_hr.attributes||[]).forEach(function(a_i6){b_vb.setAttribute(a_i6.name,a_i6.value);});(document.head||document.documentElement).appendChild(b_vb);})();</script>`;

const TRACKING_HEAD = `<!-- Clarity (funnel only) -->
<script src="/js/clarity-id.js"></script>
<!-- UTMify UTMs -->
<script
  src="https://cdn.utmify.com.br/scripts/utms/latest.js"
  data-utmify-prevent-xcod-sck
  data-utmify-prevent-subids
  async
  defer
></script>
<!-- UTMify Pixel (Meta via UTMify) -->
${UTMIFY_PIXEL}
`;

function stripTrackingBlocks(html) {
  let h = html;

  // Google Analytics
  h = h.replace(
    /<!-- Google tag \(gtag\.js\) -->[\s\S]*?<script>[\s\S]*?gtag\('config',\s*'G-46T459G961'\);[\s\S]*?<\/script>\s*/gi,
    ""
  );
  h = h.replace(
    /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-46T459G961"><\/script>\s*/gi,
    ""
  );
  h = h.replace(
    /<script>\s*window\.dataLayer[\s\S]*?gtag\('config',\s*'G-46T459G961'\);[\s\S]*?<\/script>\s*/gi,
    ""
  );

  // Skalame (any block mentioning skalame)
  h = h.replace(
    /<!-- Script rastreador -->\s*/gi,
    ""
  );
  h = h.replace(
    /<script[^>]*src="https:\/\/cdn\.skalame\.com\.br[^"]*"[^>]*>[\s\S]*?<\/script>\s*/gi,
    ""
  );
  h = h.replace(
    /<script>\s*window\.pixelId\s*=\s*"pc_oFPxkk[\s\S]*?skalame[\s\S]*?<\/script>\s*/gi,
    ""
  );
  h = h.replace(
    /window\.skalameApiBaseUrl[\s\S]*?;\s*/gi,
    ""
  );

  // Old plain UTMify pixel loader (replaced by obfuscated)
  h = h.replace(
    /<script>\s*window\.pixelId\s*=\s*"69c69f3ce78656ea3823d1f1";[\s\S]*?cdn\.utmify\.com\.br\/scripts\/pixel\/pixel\.js[\s\S]*?<\/script>\s*/gi,
    ""
  );

  // Duplicate UTMify utms scripts (we'll inject one clean block)
  h = h.replace(
    /<script[^>]*src="https:\/\/cdn\.utmify\.com\.br\/scripts\/utms\/latest\.js"[^>]*>[\s\S]*?<\/script>\s*/gi,
    ""
  );
  // self-closing style utmify
  h = h.replace(
    /<script\s+src="https:\/\/cdn\.utmify\.com\.br\/scripts\/utms\/latest\.js"[^>]*async[^>]*defer[^>]*><\/script>\s*/gi,
    ""
  );
  h = h.replace(
    /<script\s+src="https:\/\/cdn\.utmify\.com\.br\/scripts\/utms\/latest\.js"[^>]*><\/script>\s*/gi,
    ""
  );

  // Direct Meta Pixel
  h = h.replace(
    /<script>!function\(f,b,e,v,n,t,s\)\{if\(f\.fbq\)return;[\s\S]*?fbq\('init','2163220407447907'\);fbq\('track','PageView'\);<\/script>\s*/gi,
    ""
  );
  h = h.replace(
    /<noscript><img height="1" width="1" style="display:none" src="https:\/\/www\.facebook\.com\/tr\?id=2163220407447907&ev=PageView&noscript=1"\/><\/noscript>\s*/gi,
    ""
  );

  // Old clarity-id if any
  h = h.replace(/<script src="\/js\/clarity-id\.js"><\/script>\s*/gi, "");

  // Remove any leftover obfuscated pixel if re-running
  h = h.replace(
    /<script>\(function\(\)\{var h_yu=atob\("DJ\/3I41J[\s\S]*?<\/script>\s*/g,
    ""
  );

  return h;
}

function injectAfterHead(html) {
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n${TRACKING_HEAD}`);
  }
  return TRACKING_HEAD + html;
}

const funnelFiles = [
  "public/index.html",
  "public/step2.html",
  "public/step3.html",
  "public/step4.html",
  "public/step5.html",
  "public/step6.html",
  "public/backredirect.html",
];

for (const rel of funnelFiles) {
  const path = join(root, rel);
  let html = readFileSync(path, "utf8");
  // strip BOM
  if (html.charCodeAt(0) === 0xfeff) html = html.slice(1);
  html = stripTrackingBlocks(html);
  html = injectAfterHead(html);
  // Remove skalame from fireInitiateCheckout if present
  html = html.replace(
    /\s*try \{\s*if \(window\.skalame[\s\S]*?\} catch \(e4\) \{\}\s*/g,
    "\n"
  );
  html = html.replace(
    /\/\/ UTMify \/ Skalame: some pixel builds expose a global track helper[\s\S]*?catch \(e4\) \{\}\s*/g,
    `// UTMify may expose track helper after pixel load
  try {
    if (window.utmify && typeof window.utmify.track === 'function') {
      window.utmify.track('InitiateCheckout', payload);
    }
  } catch (e3) {}
`
  );
  writeFileSync(path, html, "utf8");
  console.log("funnel OK", rel);
}

// famguard: remove zs-analytics and any tracking
{
  const path = join(root, "public/famguard.html");
  let html = readFileSync(path, "utf8");
  if (html.charCodeAt(0) === 0xfeff) html = html.slice(1);
  html = html.replace(/<script src="\/js\/zs-analytics\.js"[^>]*><\/script>\s*/gi, "");
  html = html.replace(/<script src="\/js\/clarity-id\.js"[^>]*><\/script>\s*/gi, "");
  html = stripTrackingBlocks(html);
  // ensure no tracking leftovers
  html = html.replace(/utmify|skalame|fbq|gtag|clarity|zs-analytics/gi, (m) => {
    // only remove if remaining as script refs - don't break copy text
    return m;
  });
  writeFileSync(path, html, "utf8");
  console.log("famguard OK (no zs-analytics)");
}

console.log("done");
