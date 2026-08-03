import fs from "fs";

let s = fs.readFileSync("public/step3.html", "utf8").replace(/\r\n/g, "\n");

// Remove city CSS
s = s.replace(
  /\.prof-city\{\n  display:none;align-items:center;justify-content:center;gap:\.35rem;\n  margin:0 auto \.55rem;max-width:92%;\n  font-size:\.82rem;font-weight:500;color:var\(--text2\);line-height:1\.3;\n\}\n\.prof-city\.show\{display:inline-flex;\}\n\.prof-city svg\{width:14px;height:14px;fill:#8696A0;flex-shrink:0;\}\n/,
  ""
);
s = s.replace("margin-bottom:.45rem;", "margin-bottom:.55rem;");

// Remove city HTML
s = s.replace(
  /\n      <div class="prof-city" id="prof-city"[\s\S]*?<\/div>\n      <div class="reg-badge">/,
  "\n      <div class=\"reg-badge\">"
);

const helpers = `// Gender only (Male/Female). No city. No invented age.
// Prefer WA face.gender, else step1 target gender. Else Online.
function fillGenderProfile(meta) {
  var el = document.getElementById('est-profile');
  var lbl = document.getElementById('est-profile-lbl');
  if (!el) return;
  var gender = '';
  var face = meta && meta.face ? meta.face : null;
  if (face && face.gender) {
    if (face.gender === 'male' || face.gender === 'Male') gender = 'Male';
    else if (face.gender === 'female' || face.gender === 'Female') gender = 'Female';
  }
  if (!gender) {
    var g = '';
    try {
      g = (new URLSearchParams(location.search).get('gender') || sessionStorage.getItem('sl_gender') || '').toLowerCase();
    } catch (e) {}
    if (g === 'male' || g === 'm') gender = 'Male';
    else if (g === 'female' || g === 'f') gender = 'Female';
  }
  if (gender) {
    el.textContent = gender;
    if (lbl) lbl.textContent = 'Estimated Profile';
  } else {
    el.textContent = 'Online';
    if (lbl) lbl.textContent = 'Current Status';
  }
}

`;

// Strip old geo/helpers between prefetch and statusMsgs
const marker =
  "if (window.ProfilePhoto && decoded) {\n  try { ProfilePhoto.prefetch(decoded); } catch (e) {}\n}\n";
const pi = s.indexOf(marker);
const si = s.indexOf("var statusMsgs");
if (pi !== -1 && si !== -1) {
  s = s.slice(0, pi + marker.length) + "\n" + helpers + "\n" + s.slice(si);
  console.log("helpers ok");
} else {
  console.log("WARN markers", pi, si);
}

// Profile show hooks
s = s.replace(
  /_geoPromise\.then\(fillCity\);\n\s*fill(?:Estimated|Gender)Profile\([^;]+;\n\n/,
  "fillGenderProfile(window.ProfilePhoto && ProfilePhoto.getLastMeta ? ProfilePhoto.getLastMeta() : null);\n\n"
);
s = s.replace(/fillEstimatedProfile/g, "fillGenderProfile");
s = s.replace(/fillCity\([^)]*\);?\n?/g, "");
s = s.replace(/_geoPromise\.then\([^)]*\);?\n?/g, "");

// Default left box
s = s.replace(
  /id="est-profile">[^<]*</,
  'id="est-profile">Online<'
);
s = s.replace(
  /id="est-profile-lbl">[^<]*</,
  'id="est-profile-lbl">Current Status<'
);

fs.writeFileSync("public/step3.html", s, "utf8");
console.log({
  city: s.includes("prof-city") || s.includes("fillCity") || s.includes("_geoPromise"),
  gender: s.includes("fillGenderProfile"),
  yrs: s.includes("yrs"),
  online: s.includes(">Online</span>"),
});
