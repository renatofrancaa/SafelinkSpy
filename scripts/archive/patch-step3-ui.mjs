import fs from "fs";
let s = fs.readFileSync("public/step3.html", "utf8");
// normalize CRLF for replace reliability then write LF
s = s.replace(/\r\n/g, "\n");

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
  console.log("city html", s.includes('id="prof-city"'));
}

if (s.includes(">Online</span>")) {
  s = s.replace(
    '<span class="stat-val">Online</span>\n          <span class="stat-lbl">Current Status</span>',
    '<span class="stat-val" id="est-profile">—</span>\n          <span class="stat-lbl" id="est-profile-lbl">Estimated Profile</span>'
  );
  console.log("est profile", s.includes("est-profile"));
}

const helpers = `
// Geo + estimated profile (ZapSpy funnel_light)
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

if (!s.includes("function fillCity")) {
  s = s.replace(
    "if (window.ProfilePhoto && decoded) {\n  try { ProfilePhoto.prefetch(decoded); } catch (e) {}\n}\n",
    "if (window.ProfilePhoto && decoded) {\n  try { ProfilePhoto.prefetch(decoded); } catch (e) {}\n}\n" + helpers
  );
  console.log("helpers", s.includes("function fillCity"));
}

if (!s.includes("_geoPromise.then(fillCity)")) {
  s = s.replace(
    "document.getElementById('del-count').classList.add('scanning');\n\n  // Load WhatsApp profile photo",
    "document.getElementById('del-count').classList.add('scanning');\n\n  _geoPromise.then(fillCity);\n  fillEstimatedProfile(window.ProfilePhoto && ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null);\n\n  // Load WhatsApp profile photo"
  );
  console.log("geo hook", s.includes("_geoPromise.then(fillCity)"));
}

if (!s.includes("fillEstimatedProfile(ProfilePhoto.getLastMeta")) {
  s = s.replace(
    "onResult: function (url) {\n      var real = url && (!ProfilePhoto.isRealPhotoUrl || ProfilePhoto.isRealPhotoUrl(url));\n      if (real) {",
    "onResult: function (url) {\n      var real = url && (!ProfilePhoto.isRealPhotoUrl || ProfilePhoto.isRealPhotoUrl(url));\n      try { fillEstimatedProfile(ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null); } catch (eF) {}\n      if (real) {"
  );
  console.log("onResult hook", s.includes("fillEstimatedProfile(ProfilePhoto.getLastMeta"));
}

fs.writeFileSync("public/step3.html", s, "utf8");
console.log("done city=", s.includes('id="prof-city"'), "est=", s.includes("est-profile"), "mojibake=", (s.match(/Ã.|â€|ðŸ/g)||[]).length);
