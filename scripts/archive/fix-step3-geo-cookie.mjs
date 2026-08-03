import fs from "fs";

let s = fs.readFileSync("public/step3.html", "utf8").replace(/\r\n/g, "\n");

const neu = `var _geoPromise = (async function fetchGeoLikeLight() {
  // 1) Cookie set by Vercel middleware from real visitor IP
  try {
    var m = document.cookie.match(/(?:^|; )sl_geo=([^;]*)/);
    if (m && m[1]) {
      var fromCookie = JSON.parse(decodeURIComponent(m[1]));
      if (fromCookie && fromCookie.success && fromCookie.city) return fromCookie;
    }
  } catch (e0) {}
  // 2) Same-origin API (uses x-vercel-ip-city on the visitor request)
  try {
    var r = await fetch('/api/geo?lang=en', { credentials: 'same-origin', cache: 'no-store' });
    if (r.ok) {
      var d = await r.json();
      if (d && d.success && d.city) return d;
    }
  } catch (e) {}
  return null;
})();`;

const re =
  /var _geoPromise = \(async function fetchGeoLikeLight\(\) \{[\s\S]*?\}\)\(\);/;
if (!re.test(s)) {
  console.error("geo helper not found");
  process.exit(1);
}
s = s.replace(re, neu);
fs.writeFileSync("public/step3.html", s, "utf8");
console.log("cookie geo ok", s.includes("sl_geo"));
