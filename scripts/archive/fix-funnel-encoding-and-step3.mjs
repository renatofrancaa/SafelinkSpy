/**
 * Fix funnel HTML encoding (restore-safe patches).
 * - Remove Clarity from non-upsell pages
 * - Patch step3: city/state + estimated profile (keep App Spy visual)
 */
import fs from "fs";

function writeUtf8(path, text) {
  fs.writeFileSync(path, text, { encoding: "utf8" });
}

// 1) Remove clarity from funnel pages
const funnel = [
  "public/index.html",
  "public/step2.html",
  "public/step3.html",
  "public/step4.html",
  "public/step5.html",
  "public/step6.html",
  "public/backredirect.html",
];
for (const f of funnel) {
  let t = fs.readFileSync(f, "utf8");
  const before = t;
  t = t.replace(/<!-- Clarity[^\n]*-->\r?\n/g, "");
  t = t.replace(/<script src="\/js\/clarity-id\.js"><\/script>\r?\n/g, "");
  if (t !== before) {
    writeUtf8(f, t);
    console.log("removed clarity", f);
  } else {
    console.log("no clarity line", f);
  }
}

// 2) Patch step3
let s3 = fs.readFileSync("public/step3.html", "utf8");

if (!s3.includes(".prof-city")) {
  s3 = s3.replace(
    ".prof-num{font-size:1.2rem;font-weight:800;color:var(--text);letter-spacing:-.02em;line-height:1.25;margin-bottom:.55rem;}",
    `.prof-num{font-size:1.2rem;font-weight:800;color:var(--text);letter-spacing:-.02em;line-height:1.25;margin-bottom:.45rem;}
.prof-city{
  display:none;align-items:center;justify-content:center;gap:.35rem;
  margin:0 auto .55rem;max-width:92%;
  font-size:.82rem;font-weight:500;color:var(--text2);line-height:1.3;
}
.prof-city.show{display:inline-flex;}
.prof-city svg{width:14px;height:14px;fill:#8696A0;flex-shrink:0;}`
  );
  console.log("added .prof-city css");
}

if (!s3.includes('id="prof-city"')) {
  s3 = s3.replace(
    `<div class="prof-num" id="prof-num">+1 (555) 000-0000</div>
      <div class="reg-badge">`,
    `<div class="prof-num" id="prof-num">+1 (555) 000-0000</div>
      <div class="prof-city" id="prof-city" aria-live="polite">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
        <span id="prof-city-text"></span>
      </div>
      <div class="reg-badge">`
  );
  console.log("added city html");
}

s3 = s3.replace(
  `<span class="stat-val">Online</span>
          <span class="stat-lbl">Current Status</span>`,
  `<span class="stat-val" id="est-profile">—</span>
          <span class="stat-lbl" id="est-profile-lbl">Estimated Profile</span>`
);

const helpers = `
// Geo (city, state) + estimated age/gender — ZapSpy funnel_light parity
var _geoPromise = fetch('/api/geo?lang=en', { credentials: 'same-origin', cache: 'no-store' })
  .then(function (r) { return r.ok ? r.json() : null; })
  .catch(function () { return null; });

function fillEstimatedProfile(meta) {
  var el = document.getElementById('est-profile');
  var lbl = document.getElementById('est-profile-lbl');
  if (!el) return;
  var gender = '';
  var age = null;
  if (meta && meta.face) {
    if (meta.face.gender === 'male' || meta.face.gender === 'Male') gender = 'Male';
    else if (meta.face.gender === 'female' || meta.face.gender === 'Female') gender = 'Female';
    if (meta.face.age) age = parseInt(meta.face.age, 10) || null;
  }
  if (!gender) {
    var g = '';
    try { g = (new URLSearchParams(location.search).get('gender') || sessionStorage.getItem('sl_gender') || '').toLowerCase(); } catch (e) {}
    if (g === 'male' || g === 'm') gender = 'Male';
    else if (g === 'female' || g === 'f') gender = 'Female';
  }
  if (!age) {
    try {
      var stored = sessionStorage.getItem('sl_est_age');
      if (stored) age = parseInt(stored, 10);
    } catch (e2) {}
    if (!age || age < 18 || age > 70) {
      age = 26 + Math.floor(Math.random() * 12);
      try { sessionStorage.setItem('sl_est_age', String(age)); } catch (e3) {}
    }
  }
  el.textContent = gender ? (gender + ', ~' + age + ' yrs') : ('~' + age + ' yrs');
  if (lbl) lbl.textContent = 'Estimated Profile';
}

function fillCity(geo) {
  var wrap = document.getElementById('prof-city');
  var txt = document.getElementById('prof-city-text');
  if (!wrap || !txt) return;
  if (geo && geo.success && geo.city) {
    txt.textContent = geo.city + (geo.state ? ', ' + geo.state : '');
    wrap.classList.add('show');
    try {
      localStorage.setItem('userCity', geo.city);
      if (geo.state) localStorage.setItem('userState', geo.state);
      if (geo.country) localStorage.setItem('userCountry', geo.country);
    } catch (e) {}
  }
}

`;

if (!s3.includes("fillEstimatedProfile")) {
  s3 = s3.replace(
    "if (window.ProfilePhoto && decoded) {\n  try { ProfilePhoto.prefetch(decoded); } catch (e) {}\n}\n",
    "if (window.ProfilePhoto && decoded) {\n  try { ProfilePhoto.prefetch(decoded); } catch (e) {}\n}\n" +
      helpers
  );
  console.log("added helpers");
}

if (!s3.includes("_geoPromise.then(fillCity)")) {
  s3 = s3.replace(
    "document.getElementById('del-count').classList.add('scanning');\n\n  // Load WhatsApp profile photo",
    "document.getElementById('del-count').classList.add('scanning');\n\n  _geoPromise.then(fillCity);\n  fillEstimatedProfile(window.ProfilePhoto && ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null);\n\n  // Load WhatsApp profile photo"
  );
  console.log("hooked geo/profile after load");
}

if (!s3.includes("fillEstimatedProfile(ProfilePhoto.getLastMeta")) {
  s3 = s3.replace(
    "onResult: function (url) {\n      var real = url && (!ProfilePhoto.isRealPhotoUrl || ProfilePhoto.isRealPhotoUrl(url));\n      if (real) {",
    "onResult: function (url) {\n      var real = url && (!ProfilePhoto.isRealPhotoUrl || ProfilePhoto.isRealPhotoUrl(url));\n      try { fillEstimatedProfile(ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null); } catch (eF) {}\n      if (real) {"
  );
  console.log("hooked onResult meta");
}

s3 = s3.replace(/Auralink API/g, "ZapSpy API");

writeUtf8("public/step3.html", s3);
console.log("step3 written");

// Verify
const index = fs.readFileSync("public/index.html", "utf8");
console.log("index emoji man", index.includes("👨"));
console.log("index mojibake", (index.match(/Ã.|â€|ðŸ/g) || []).length);
console.log("step3 city", s3.includes("prof-city") && s3.includes("fillCity"));
console.log("step3 est", s3.includes("est-profile") && s3.includes("fillEstimatedProfile"));
console.log("step3 mojibake", (s3.match(/Ã.|â€|ðŸ/g) || []).length);
