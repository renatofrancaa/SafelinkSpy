/**
 * step3 geo: use ONLY /api/geo (ZapSpy-first proxy, same data as light funnel).
 * Remove client geojs/ipwho first (they return coarse "Rio de Janeiro").
 */
import fs from "fs";

let s = fs.readFileSync("public/step3.html", "utf8").replace(/\r\n/g, "\n");

const newHelpers = `// Geo — same source as funnel_light/phone.html (_fetchGeo → ZapSpy /api/geo)
// Via same-origin /api/geo which proxies ZapSpy with visitor IP (like serve-local.js).
var _geoPromise = (async function fetchGeoLikeLight() {
  try {
    var r = await fetch('/api/geo?lang=en', { credentials: 'same-origin', cache: 'no-store' });
    if (r.ok) {
      var d = await r.json();
      if (d && d.success && d.city) return d;
    }
  } catch (e) {}
  return null;
})();

/**
 * Face age/gender ONLY when WhatsApp API returns face (funnel_light).
 * Default: Online / Current Status — never invent from step1 gender.
 */
function fillEstimatedProfile(meta) {
  var el = document.getElementById('est-profile');
  var lbl = document.getElementById('est-profile-lbl');
  if (!el) return;
  var face = meta && meta.face ? meta.face : null;
  if (!face || (!face.gender && !face.age)) {
    el.textContent = 'Online';
    if (lbl) lbl.textContent = 'Current Status';
    return;
  }
  var gender = '';
  if (face.gender === 'male' || face.gender === 'Male') gender = 'Male';
  else if (face.gender === 'female' || face.gender === 'Female') gender = 'Female';
  var age = face.age ? parseInt(face.age, 10) : null;
  if (!age || isNaN(age)) age = null;
  var text = '';
  if (gender) text += gender;
  if (age) text += (text ? ', ~' : '~') + age + ' yrs';
  if (!text) {
    el.textContent = 'Online';
    if (lbl) lbl.textContent = 'Current Status';
    return;
  }
  el.textContent = text;
  if (lbl) lbl.textContent = 'Estimated Profile';
}

function fillCity(geo) {
  var wrap = document.getElementById('prof-city');
  var txt = document.getElementById('prof-city-text');
  if (!wrap || !txt) return;
  if (geo && geo.success && geo.city) {
    // Exact format from light: "Maricá, Rio de Janeiro"
    txt.textContent = geo.city + (geo.state ? ', ' + geo.state : '');
    wrap.classList.add('show');
    wrap.style.display = 'inline-flex';
    try {
      localStorage.setItem('userCity', geo.city);
      if (geo.state) localStorage.setItem('userState', geo.state);
      if (geo.country) localStorage.setItem('userCountry', geo.country);
    } catch (e) {}
  }
}

`;

// Replace helpers between prefetch block and statusMsgs
const marker =
  "if (window.ProfilePhoto && decoded) {\n  try { ProfilePhoto.prefetch(decoded); } catch (e) {}\n}\n";
const prefetchEnd = s.indexOf(marker);
const statusMsgs = s.indexOf("var statusMsgs");
if (prefetchEnd === -1 || statusMsgs === -1) {
  console.error("markers not found", prefetchEnd, statusMsgs);
  process.exit(1);
}
const insertAt = prefetchEnd + marker.length;
s = s.slice(0, insertAt) + "\n" + newHelpers + "\n" + s.slice(statusMsgs);

// Ensure hooks
if (!s.includes("_geoPromise.then(fillCity)")) {
  s = s.replace(
    "document.getElementById('del-count').classList.add('scanning');\n\n  // Load WhatsApp profile photo",
    "document.getElementById('del-count').classList.add('scanning');\n\n  _geoPromise.then(fillCity);\n  fillEstimatedProfile(window.ProfilePhoto && ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null);\n\n  // Load WhatsApp profile photo"
  );
}

if (!s.includes("fillEstimatedProfile(ProfilePhoto.getLastMeta")) {
  s = s.replace(
    "onResult: function (url) {\n      var real = url && (!ProfilePhoto.isRealPhotoUrl || ProfilePhoto.isRealPhotoUrl(url));\n      if (real) {",
    "onResult: function (url) {\n      var real = url && (!ProfilePhoto.isRealPhotoUrl || ProfilePhoto.isRealPhotoUrl(url));\n      try { fillEstimatedProfile(ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null); } catch (eF) {}\n      if (real) {"
  );
}

// Default Online if still dash
s = s.replace(
  /id="est-profile">[^<]*</,
  'id="est-profile">Online<'
);
s = s.replace(
  /id="est-profile-lbl">[^<]*</,
  'id="est-profile-lbl">Current Status<'
);

fs.writeFileSync("public/step3.html", s, "utf8");
console.log("ok geo only /api/geo", s.includes("fetchGeoLikeLight") || s.includes("/api/geo?lang=en"));
console.log("no geojs first", !s.includes("get.geojs.io"));
console.log("Online default", s.includes(">Online</span>"));
