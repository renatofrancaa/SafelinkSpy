/*
 * Country-code (DDI) list + IP geo preselect for target phone field.
 * Puts the visitor's country dial code first in the select (from IP).
 */
(function () {
  'use strict';

  var DDI = [
    ['+1', '🇺🇸 +1'], ['+1', '🇨🇦 +1'], ['+44', '🇬🇧 +44'], ['+61', '🇦🇺 +61'], ['+64', '🇳🇿 +64'],
    ['+353', '🇮🇪 +353'], ['+27', '🇿🇦 +27'], ['+65', '🇸🇬 +65'], ['+63', '🇵🇭 +63'], ['+91', '🇮🇳 +91'],
    ['+234', '🇳🇬 +234'], ['+254', '🇰🇪 +254'], ['+233', '🇬🇭 +233'], ['+256', '🇺🇬 +256'], ['+255', '🇹🇿 +255'],
    ['+263', '🇿🇼 +263'], ['+260', '🇿🇲 +260'], ['+267', '🇧🇼 +267'], ['+1876', '🇯🇲 +1876'], ['+1868', '🇹🇹 +1868'],
    ['+1246', '🇧🇧 +1246'], ['+1242', '🇧🇸 +1242'], ['+49', '🇩🇪 +49'], ['+33', '🇫🇷 +33'], ['+34', '🇪🇸 +34'],
    ['+39', '🇮🇹 +39'], ['+351', '🇵🇹 +351'], ['+31', '🇳🇱 +31'], ['+32', '🇧🇪 +32'], ['+41', '🇨🇭 +41'],
    ['+43', '🇦🇹 +43'], ['+46', '🇸🇪 +46'], ['+47', '🇳🇴 +47'], ['+45', '🇩🇰 +45'], ['+358', '🇫🇮 +358'],
    ['+48', '🇵🇱 +48'], ['+30', '🇬🇷 +30'], ['+7', '🇷🇺 +7'], ['+90', '🇹🇷 +90'], ['+380', '🇺🇦 +380'],
    ['+420', '🇨🇿 +420'], ['+36', '🇭🇺 +36'], ['+40', '🇷🇴 +40'], ['+359', '🇧🇬 +359'], ['+381', '🇷🇸 +381'],
    ['+385', '🇭🇷 +385'], ['+386', '🇸🇮 +386'], ['+421', '🇸🇰 +421'], ['+370', '🇱🇹 +370'], ['+371', '🇱🇻 +371'],
    ['+372', '🇪🇪 +372'], ['+375', '🇧🇾 +375'], ['+373', '🇲🇩 +373'], ['+355', '🇦🇱 +355'], ['+389', '🇲🇰 +389'],
    ['+387', '🇧🇦 +387'], ['+382', '🇲🇪 +382'], ['+383', '🇽🇰 +383'], ['+354', '🇮🇸 +354'], ['+352', '🇱🇺 +352'],
    ['+356', '🇲🇹 +356'], ['+357', '🇨🇾 +357'], ['+376', '🇦🇩 +376'], ['+377', '🇲🇨 +377'], ['+378', '🇸🇲 +378'],
    ['+423', '🇱🇮 +423'], ['+55', '🇧🇷 +55'], ['+52', '🇲🇽 +52'], ['+54', '🇦🇷 +54'], ['+57', '🇨🇴 +57'],
    ['+56', '🇨🇱 +56'], ['+51', '🇵🇪 +51'], ['+58', '🇻🇪 +58'], ['+593', '🇪🇨 +593'], ['+591', '🇧🇴 +591'],
    ['+595', '🇵🇾 +595'], ['+598', '🇺🇾 +598'], ['+502', '🇬🇹 +502'], ['+503', '🇸🇻 +503'], ['+504', '🇭🇳 +504'],
    ['+505', '🇳🇮 +505'], ['+506', '🇨🇷 +506'], ['+507', '🇵🇦 +507'], ['+53', '🇨🇺 +53'], ['+1809', '🇩🇴 +1809'],
    ['+1787', '🇵🇷 +1787'], ['+509', '🇭🇹 +509'], ['+501', '🇧🇿 +501'], ['+592', '🇬🇾 +592'], ['+597', '🇸🇷 +597'],
    ['+594', '🇬🇫 +594'], ['+1264', '🇦🇮 +1264'], ['+1268', '🇦🇬 +1268'], ['+297', '🇦🇼 +297'], ['+1441', '🇧🇲 +1441'],
    ['+599', '🇧🇶 +599'], ['+1284', '🇻🇬 +1284'], ['+1345', '🇰🇾 +1345'], ['+5999', '🇨🇼 +5999'], ['+1767', '🇩🇲 +1767'],
    ['+1473', '🇬🇩 +1473'], ['+590', '🇬🇵 +590'], ['+596', '🇲🇶 +596'], ['+1664', '🇲🇸 +1664'], ['+1869', '🇰🇳 +1869'],
    ['+1758', '🇱🇨 +1758'], ['+1721', '🇸🇽 +1721'], ['+1784', '🇻🇨 +1784'], ['+1649', '🇹🇨 +1649'], ['+1340', '🇻🇮 +1340'],
    ['+81', '🇯🇵 +81'], ['+82', '🇰🇷 +82'], ['+86', '🇨🇳 +86'], ['+852', '🇭🇰 +852'], ['+853', '🇲🇴 +853'],
    ['+886', '🇹🇼 +886'], ['+62', '🇮🇩 +62'], ['+66', '🇹🇭 +66'], ['+84', '🇻🇳 +84'], ['+60', '🇲🇾 +60'],
    ['+855', '🇰🇭 +855'], ['+856', '🇱🇦 +856'], ['+95', '🇲🇲 +95'], ['+880', '🇧🇩 +880'], ['+92', '🇵🇰 +92'],
    ['+94', '🇱🇰 +94'], ['+977', '🇳🇵 +977'], ['+975', '🇧🇹 +975'], ['+960', '🇲🇻 +960'], ['+93', '🇦🇫 +93'],
    ['+850', '🇰🇵 +850'], ['+976', '🇲🇳 +976'], ['+673', '🇧🇳 +673'], ['+670', '🇹🇱 +670'], ['+971', '🇦🇪 +971'],
    ['+966', '🇸🇦 +966'], ['+972', '🇮🇱 +972'], ['+962', '🇯🇴 +962'], ['+961', '🇱🇧 +961'], ['+963', '🇸🇾 +963'],
    ['+964', '🇮🇶 +964'], ['+98', '🇮🇷 +98'], ['+965', '🇰🇼 +965'], ['+974', '🇶🇦 +974'], ['+973', '🇧🇭 +973'],
    ['+968', '🇴🇲 +968'], ['+967', '🇾🇪 +967'], ['+970', '🇵🇸 +970'], ['+998', '🇺🇿 +998'], ['+993', '🇹🇲 +993'],
    ['+992', '🇹🇯 +992'], ['+996', '🇰🇬 +996'], ['+994', '🇦🇿 +994'], ['+995', '🇬🇪 +995'], ['+374', '🇦🇲 +374'],
    ['+20', '🇪🇬 +20'], ['+212', '🇲🇦 +212'], ['+213', '🇩🇿 +213'], ['+216', '🇹🇳 +216'], ['+218', '🇱🇾 +218'],
    ['+249', '🇸🇩 +249'], ['+251', '🇪🇹 +251'], ['+252', '🇸🇴 +252'], ['+253', '🇩🇯 +253'], ['+291', '🇪🇷 +291'],
    ['+221', '🇸🇳 +221'], ['+220', '🇬🇲 +220'], ['+224', '🇬🇳 +224'], ['+225', '🇨🇮 +225'], ['+226', '🇧🇫 +226'],
    ['+227', '🇳🇪 +227'], ['+228', '🇹🇬 +228'], ['+229', '🇧🇯 +229'], ['+230', '🇲🇺 +230'], ['+231', '🇱🇷 +231'],
    ['+232', '🇸🇱 +232'], ['+235', '🇹🇩 +235'], ['+236', '🇨🇫 +236'], ['+237', '🇨🇲 +237'], ['+238', '🇨🇻 +238'],
    ['+239', '🇸🇹 +239'], ['+240', '🇬🇶 +240'], ['+241', '🇬🇦 +241'], ['+242', '🇨🇬 +242'], ['+243', '🇨🇩 +243'],
    ['+244', '🇦🇴 +244'], ['+245', '🇬🇼 +245'], ['+248', '🇸🇨 +248'], ['+250', '🇷🇼 +250'], ['+257', '🇧🇮 +257'],
    ['+258', '🇲🇿 +258'], ['+261', '🇲🇬 +261'], ['+262', '🇷🇪 +262'], ['+264', '🇳🇦 +264'], ['+265', '🇲🇼 +265'],
    ['+266', '🇱🇸 +266'], ['+268', '🇸🇿 +268'], ['+269', '🇰🇲 +269'], ['+290', '🇸🇭 +290'], ['+675', '🇵🇬 +675'],
    ['+679', '🇫🇯 +679'], ['+676', '🇹🇴 +676'], ['+677', '🇸🇧 +677'], ['+678', '🇻🇺 +678'], ['+680', '🇵🇼 +680'],
    ['+681', '🇼🇫 +681'], ['+682', '🇨🇰 +682'], ['+683', '🇳🇺 +683'], ['+685', '🇼🇸 +685'], ['+686', '🇰🇮 +686'],
    ['+687', '🇳🇨 +687'], ['+688', '🇹🇻 +688'], ['+689', '🇵🇫 +689'], ['+690', '🇹🇰 +690'], ['+691', '🇫🇲 +691'],
    ['+692', '🇲🇭 +692'], ['+674', '🇳🇷 +674']
  ];

  // ISO 3166-1 alpha-2 → dial code (first match wins for +1 countries)
  var ISO_TO_DDI = {
    US: '+1', CA: '+1', GB: '+44', UK: '+44', AU: '+61', NZ: '+64', IE: '+353', ZA: '+27',
    SG: '+65', PH: '+63', IN: '+91', NG: '+234', KE: '+254', GH: '+233', UG: '+256', TZ: '+255',
    ZW: '+263', ZM: '+260', BW: '+267', JM: '+1876', TT: '+1868', BB: '+1246', BS: '+1242',
    DE: '+49', FR: '+33', ES: '+34', IT: '+39', PT: '+351', NL: '+31', BE: '+32', CH: '+41',
    AT: '+43', SE: '+46', NO: '+47', DK: '+45', FI: '+358', PL: '+48', GR: '+30', RU: '+7',
    TR: '+90', UA: '+380', CZ: '+420', HU: '+36', RO: '+40', BG: '+359', RS: '+381',
    HR: '+385', SI: '+386', SK: '+421', LT: '+370', LV: '+371', EE: '+372', BY: '+375',
    MD: '+373', AL: '+355', MK: '+389', BA: '+387', ME: '+382', XK: '+383', IS: '+354',
    LU: '+352', MT: '+356', CY: '+357', AD: '+376', MC: '+377', SM: '+378', LI: '+423',
    BR: '+55', MX: '+52', AR: '+54', CO: '+57', CL: '+56', PE: '+51', VE: '+58', EC: '+593',
    BO: '+591', PY: '+595', UY: '+598', GT: '+502', SV: '+503', HN: '+504', NI: '+505',
    CR: '+506', PA: '+507', CU: '+53', DO: '+1809', PR: '+1787', HT: '+509', BZ: '+501',
    GY: '+592', SR: '+597', JP: '+81', KR: '+82', CN: '+86', HK: '+852', MO: '+853', TW: '+886',
    ID: '+62', TH: '+66', VN: '+84', MY: '+60', KH: '+855', LA: '+856', MM: '+95', BD: '+880',
    PK: '+92', LK: '+94', NP: '+977', BT: '+975', MV: '+960', AF: '+93', KP: '+850', MN: '+976',
    BN: '+673', TL: '+670', AE: '+971', SA: '+966', IL: '+972', JO: '+962', LB: '+961', SY: '+963',
    IQ: '+964', IR: '+98', KW: '+965', QA: '+974', BH: '+973', OM: '+968', YE: '+967', PS: '+970',
    UZ: '+998', TM: '+993', TJ: '+992', KG: '+996', AZ: '+994', GE: '+995', AM: '+374',
    EG: '+20', MA: '+212', DZ: '+213', TN: '+216', LY: '+218', SD: '+249', ET: '+251',
    SO: '+252', DJ: '+253', ER: '+291', SN: '+221', GM: '+220', GN: '+224', CI: '+225',
    BF: '+226', NE: '+227', TG: '+228', BJ: '+229', MU: '+230', LR: '+231', SL: '+232',
    TD: '+235', CF: '+236', CM: '+237', CV: '+238', ST: '+239', GQ: '+240', GA: '+241',
    CG: '+242', CD: '+243', AO: '+244', GW: '+245', SC: '+248', RW: '+250', BI: '+257',
    MZ: '+258', MG: '+261', RE: '+262', NA: '+264', MW: '+265', LS: '+266', SZ: '+268',
    KM: '+269', SH: '+290', PG: '+675', FJ: '+679', TO: '+676', SB: '+677', VU: '+678',
    PW: '+680', WF: '+681', CK: '+682', NU: '+683', WS: '+685', KI: '+686', NC: '+687',
    TV: '+688', PF: '+689', TK: '+690', FM: '+691', MH: '+692', NR: '+674'
  };

  function populate(sel) {
    if (!sel) return;
    var html = '';
    for (var i = 0; i < DDI.length; i++) {
      html +=
        '<option value="' +
        DDI[i][0] +
        '"' +
        (i === 0 ? ' selected' : '') +
        '>' +
        DDI[i][1] +
        '</option>';
    }
    sel.innerHTML = html;
  }

  /**
   * Move matching dial option to top of <select> and select it.
   * For +1, prefer US option when iso is US, CA when iso is CA.
   */
  function preferDial(sel, dial, iso) {
    if (!sel || !dial) return false;
    dial = String(dial);
    if (dial.charAt(0) !== '+') dial = '+' + dial;

    var matchIdx = -1;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === dial) {
        // Disambiguate +1 US vs CA by option label flag when possible
        if (dial === '+1' && iso) {
          var label = sel.options[i].text || '';
          if (iso === 'CA' && label.indexOf('🇨🇦') === -1) continue;
          if (iso === 'US' && label.indexOf('🇨🇦') !== -1) continue;
        }
        matchIdx = i;
        break;
      }
    }
    if (matchIdx < 0) {
      // fallback: first exact dial match
      for (var j = 0; j < sel.options.length; j++) {
        if (sel.options[j].value === dial) {
          matchIdx = j;
          break;
        }
      }
    }
    if (matchIdx < 0) return false;

    var opt = sel.options[matchIdx];
    if (matchIdx > 0) {
      sel.removeChild(opt);
      sel.insertBefore(opt, sel.options[0] || null);
    }
    sel.selectedIndex = 0;
    sel.value = dial;
    try {
      localStorage.setItem('targetCountryCode', dial);
      if (iso) localStorage.setItem('visitorCountryCode', iso);
    } catch (e) {}
    return true;
  }

  function selectByIso(sel, iso) {
    if (!iso) return false;
    iso = String(iso).toUpperCase();
    var dial = ISO_TO_DDI[iso];
    if (!dial) return false;
    return preferDial(sel, dial, iso);
  }

  function fetchJson(url, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () {
      try {
        if (ctrl) ctrl.abort();
      } catch (e) {}
    }, ms || 5000);
    return fetch(url, {
      signal: ctrl ? ctrl.signal : undefined,
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
      .then(function (r) {
        if (!r.ok) throw new Error('http');
        return r.json();
      })
      .finally(function () {
        clearTimeout(t);
      });
  }

  /**
   * Resolve visitor country ISO from IP (ipwho.is → ipapi.co → geojs).
   */
  function resolveCountryFromIp() {
    // cache
    try {
      var cached = localStorage.getItem('visitorCountryCode');
      if (cached && /^[A-Z]{2}$/.test(cached)) {
        return Promise.resolve(cached);
      }
    } catch (e) {}

    return fetchJson('https://ipwho.is/', 4500)
      .then(function (d) {
        if (d && d.success !== false && d.country_code) {
          return String(d.country_code).toUpperCase();
        }
        throw new Error('ipwho');
      })
      .catch(function () {
        return fetchJson('https://ipapi.co/json/', 4500).then(function (d) {
          if (d && d.country_code) return String(d.country_code).toUpperCase();
          throw new Error('ipapi');
        });
      })
      .catch(function () {
        return fetchJson('https://get.geojs.io/v1/ip/country.json', 4500).then(function (d) {
          if (d && d.country) return String(d.country).toUpperCase();
          throw new Error('geojs');
        });
      })
      .then(function (iso) {
        try {
          if (iso) localStorage.setItem('visitorCountryCode', iso);
        } catch (e) {}
        return iso;
      })
      .catch(function () {
        return '';
      });
  }

  /**
   * Always put IP-detected country first when showing the number form.
   */
  function preselectFromIp(sel) {
    sel = sel || document.getElementById('targetCountryCode');
    if (!sel) return Promise.resolve(false);
    if (!sel.options.length) populate(sel);

    return resolveCountryFromIp().then(function (iso) {
      if (iso && selectByIso(sel, iso)) return true;
      // fallback: previously chosen dial if any
      try {
        var saved = localStorage.getItem('targetCountryCode');
        if (saved && preferDial(sel, saved, '')) return true;
      } catch (e) {}
      return false;
    });
  }

  function init() {
    var sel = document.getElementById('targetCountryCode');
    if (!sel) return;
    populate(sel);
    // Non-blocking: default list first, then promote IP country to top
    preselectFromIp(sel);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.ZapDDI = {
    populate: populate,
    preferDial: preferDial,
    selectByIso: selectByIso,
    preselectFromIp: preselectFromIp,
    resolveCountryFromIp: resolveCountryFromIp,
    ISO_TO_DDI: ISO_TO_DDI
  };
})();
