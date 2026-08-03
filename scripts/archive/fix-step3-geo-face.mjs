/**
 * Align step3 with funnel_light/phone.html behavior:
 * - Geo in BROWSER (real visitor IP) — not Vercel server IP
 * - Estimated Profile ONLY when WA face API returns gender/age
 * - Default left box: Online / Current Status
 * - Order: number → city → Registered → stats (same as phone.html)
 */
import fs from "fs";

let s = fs.readFileSync("public/step3.html", "utf8").replace(/\r\n/g, "\n");

// Default stats text Online / Current Status
s = s.replace(
  /<span class="stat-val" id="est-profile">[^<]*<\/span>\n\s*<span class="stat-lbl" id="est-profile-lbl">[^<]*<\/span>/,
  `<span class="stat-val" id="est-profile">Online</span>
          <span class="stat-lbl" id="est-profile-lbl">Current Status</span>`
);

// Also if still bare Online without ids
if (!s.includes('id="est-profile"')) {
  s = s.replace(
    `<span class="stat-val">Online</span>
          <span class="stat-lbl">Current Status</span>`,
    `<span class="stat-val" id="est-profile">Online</span>
          <span class="stat-lbl" id="est-profile-lbl">Current Status</span>`
  );
}

const newHelpers = `// Geo + face profile — same logic as funnel_light/ingles/light/phone.html
// Geo MUST run in the browser (real visitor IP). /api/geo on Vercel often shows CDN city (São Paulo).
var _geoPromise = (async function fetchGeoClient() {
  // 1) geojs — uses visitor IP in the browser
  try {
    var r1 = await fetch('https://get.geojs.io/v1/ip/geo.json', { cache: 'no-store' });
    if (r1.ok) {
      var d1 = await r1.json();
      if (d1 && d1.city) {
        return {
          success: true,
          city: d1.city,
          state: d1.region || '',
          country: d1.country || '',
          country_code: d1.country_code || '',
          source: 'geojs'
        };
      }
    }
  } catch (e1) {}
  // 2) ipwho.is
  try {
    var r2 = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (r2.ok) {
      var d2 = await r2.json();
      if (d2 && d2.success !== false && d2.city) {
        return {
          success: true,
          city: d2.city,
          state: d2.region || '',
          country: d2.country || '',
          country_code: d2.country_code || '',
          source: 'ipwho'
        };
      }
    }
  } catch (e2) {}
  // 3) same-origin proxy last resort
  try {
    var r3 = await fetch('/api/geo?lang=en', { credentials: 'same-origin', cache: 'no-store' });
    if (r3.ok) {
      var d3 = await r3.json();
      if (d3 && d3.success && d3.city) return d3;
    }
  } catch (e3) {}
  return null;
})();

/**
 * Only show Male/Female + age when WhatsApp face API returns data (funnel_light).
 * Otherwise keep Online / Current Status.
 * NEVER invent gender/age from step1 gender pick.
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

// Remove any previous helper blocks between prefetch and statusMsgs
const prefetchEnd = s.indexOf(
  "if (window.ProfilePhoto && decoded) {\n  try { ProfilePhoto.prefetch(decoded); } catch (e) {}\n}\n"
);
const statusMsgs = s.indexOf("var statusMsgs");
if (prefetchEnd !== -1 && statusMsgs !== -1) {
  const insertAt =
    prefetchEnd +
    "if (window.ProfilePhoto && decoded) {\n  try { ProfilePhoto.prefetch(decoded); } catch (e) {}\n}\n"
      .length;
  // Strip anything we previously injected between prefetch and statusMsgs
  s =
    s.slice(0, insertAt) +
    "\n" +
    newHelpers +
    "\n" +
    s.slice(statusMsgs);
  console.log("helpers rewritten");
} else {
  console.log("WARN: could not locate prefetch/statusMsgs", prefetchEnd, statusMsgs);
}

// After scanning: geo + face
if (!s.includes("_geoPromise.then(fillCity)")) {
  s = s.replace(
    "document.getElementById('del-count').classList.add('scanning');\n\n  // Load WhatsApp profile photo",
    "document.getElementById('del-count').classList.add('scanning');\n\n  _geoPromise.then(fillCity);\n  fillEstimatedProfile(window.ProfilePhoto && ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null);\n\n  // Load WhatsApp profile photo"
  );
  console.log("geo hook added");
} else {
  // Ensure fillEstimatedProfile call uses getLastMeta (may already exist)
  console.log("geo hook present");
}

// onResult refresh face
if (!s.includes("fillEstimatedProfile(ProfilePhoto.getLastMeta")) {
  s = s.replace(
    "onResult: function (url) {\n      var real = url && (!ProfilePhoto.isRealPhotoUrl || ProfilePhoto.isRealPhotoUrl(url));\n      if (real) {",
    "onResult: function (url) {\n      var real = url && (!ProfilePhoto.isRealPhotoUrl || ProfilePhoto.isRealPhotoUrl(url));\n      try { fillEstimatedProfile(ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null); } catch (eF) {}\n      if (real) {"
  );
  console.log("onResult hook added");
}

// HTML order already: number, city, registered — good
// Ensure city block exists
if (!s.includes('id="prof-city"')) {
  s = s.replace(
    '<div class="prof-num" id="prof-num">+1 (555) 000-0000</div>\n      <div class="reg-badge">',
    `<div class="prof-num" id="prof-num">+1 (555) 000-0000</div>
      <div class="prof-city" id="prof-city" aria-live="polite">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
        <span id="prof-city-text"></span>
      </div>
      <div class="reg-badge">`
  );
  console.log("city html added");
}

fs.writeFileSync("public/step3.html", s, "utf8");
console.log("done");
console.log("client geojs", s.includes("get.geojs.io"));
console.log("no sl_gender invent", !s.includes("sl_gender"));
console.log("Online default", s.includes(">Online</span>"));
console.log("face only comment", s.includes("NEVER invent") || s.includes("Do NOT invent") || s.includes("ONLY show"));
