import fs from "fs";
import path from "path";

const dir = "public/upsell";

for (let n = 1; n <= 7; n++) {
  const f = path.join(dir, `up${n}.html`);
  let s = fs.readFileSync(f, "utf8");
  const tier = `up${n}`;

  const oldCheckout =
    /try \{\s*if \(window\.ZSAnalytics && ZSAnalytics\.checkout\) \{\s*ZSAnalytics\.checkout\(\{ tier: "up\d+", value: VALUE, planLabel: LABEL, code: CODE \}\);\s*\}\s*\} catch\(e\)\{\}/;

  const newCheckout = `try {
      if (window.ZSAnalytics) {
        if (ZSAnalytics.upsellAccept) {
          ZSAnalytics.upsellAccept({ tier: "${tier}", upsell: "${tier}", value: VALUE, planLabel: LABEL, code: CODE });
        } else if (ZSAnalytics.checkout) {
          ZSAnalytics.checkout({ tier: "${tier}", value: VALUE, planLabel: LABEL, code: CODE, force: true });
        }
      }
    } catch(e){}`;

  if (!oldCheckout.test(s)) console.log("no checkout match", f);
  else s = s.replace(oldCheckout, newCheckout);

  const oldNav =
    /navigateWithQuery\('https:\/\/go\.centerpag\.com\/' \+ CODE \+ '\?upsell=true', attributionParams\(\{\s*name: name,\s*email: email,\s*phone: phone,\s*plan: "up\d+",\s*upsell: 'true'\s*\}\)\)/;

  const newNav = `navigateWithQuery('https://go.centerpag.com/' + CODE + '?upsell=true', attributionParams({
        name: name,
        email: email,
        phone: phone,
        plan: "${tier}",
        upsell: 'true',
        src: (window.ZSAnalytics && ZSAnalytics.getVisitorId) ? ZSAnalytics.getVisitorId() : '',
        zs_vid: (window.ZSAnalytics && ZSAnalytics.getVisitorId) ? ZSAnalytics.getVisitorId() : ''
      }))`;

  if (!oldNav.test(s)) console.log("no nav match", f);
  else s = s.replace(oldNav, newNav);

  const oldNext =
    /function goNext\(\)\{\s*if \(!NEXT\) return;\s*navigateWithQuery\(NEXT, attributionParams\(\)\);\s*\}/;

  const newNext = `function goNext(){
    if (!NEXT) return;
    try {
      if (window.ZSAnalytics && ZSAnalytics.upsellDecline) {
        ZSAnalytics.upsellDecline({ tier: "${tier}", upsell: "${tier}", next: NEXT });
      }
    } catch (e) {}
    navigateWithQuery(NEXT, attributionParams());
  }`;

  if (!oldNext.test(s)) console.log("no next match", f);
  else s = s.replace(oldNext, newNext);

  fs.writeFileSync(f, s);
  console.log("updated", f);
}
