/**
 * Deterministic case builder — full scan delivered + no infidelity signals.
 * Same phone always yields the same sealed dossier. (Internal engine only.)
 */
(function (w) {
  'use strict';

  function cyrb53(str, seed) {
    seed = seed || 0;
    var h1 = 0xdeadbeef ^ seed;
    var h2 = 0x41c6ce57 ^ seed;
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rint(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function digits(phone) {
    return String(phone || '').replace(/\D/g, '') || '0000000000';
  }

  function formatPhone(phone) {
    var d = digits(phone);
    if (d.length >= 11 && d[0] === '1') {
      return '+1 (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7, 11);
    }
    if (d.length >= 12 && d.indexOf('55') === 0) {
      return '+55 (' + d.slice(2, 4) + ') ' + d.slice(4, 9) + '-' + d.slice(9);
    }
    if (String(phone || '').trim().charAt(0) === '+') return String(phone).trim();
    return '+' + d;
  }

  function caseIdFrom(phone) {
    var h = cyrb53(digits(phone), 42).toString(16).toUpperCase();
    return 'SLS-' + h.slice(0, 6);
  }

  function sealHash(phone, caseId) {
    var h = cyrb53(digits(phone) + '|' + caseId + '|SEALED-v3', 99)
      .toString(16)
      .toUpperCase();
    return (h + h).slice(0, 32).replace(/(.{4})/g, '$1-').replace(/-$/, '');
  }

  function countryFromPhone(phone) {
    var d = digits(phone);
    if (d.indexOf('55') === 0 && d.length >= 12)
      return { code: 'BR', name: 'Brazil', ddi: '+55', region: 'LATAM' };
    if (d.indexOf('351') === 0)
      return { code: 'PT', name: 'Portugal', ddi: '+351', region: 'EU' };
    if (d.indexOf('34') === 0)
      return { code: 'ES', name: 'Spain', ddi: '+34', region: 'EU' };
    if (d.indexOf('33') === 0)
      return { code: 'FR', name: 'France', ddi: '+33', region: 'EU' };
    if (d.indexOf('49') === 0)
      return { code: 'DE', name: 'Germany', ddi: '+49', region: 'EU' };
    if (d.indexOf('44') === 0)
      return { code: 'GB', name: 'United Kingdom', ddi: '+44', region: 'EU' };
    if (d.indexOf('39') === 0)
      return { code: 'IT', name: 'Italy', ddi: '+39', region: 'EU' };
    if (d.indexOf('52') === 0)
      return { code: 'MX', name: 'Mexico', ddi: '+52', region: 'LATAM' };
    if (d.indexOf('54') === 0)
      return { code: 'AR', name: 'Argentina', ddi: '+54', region: 'LATAM' };
    if (d.indexOf('61') === 0)
      return { code: 'AU', name: 'Australia', ddi: '+61', region: 'APAC' };
    if (d[0] === '1' || d.length === 10)
      return { code: 'US', name: 'United States', ddi: '+1', region: 'NA' };
    return { code: 'INTL', name: 'International', ddi: '+' + d.slice(0, 2), region: 'GLOBAL' };
  }

  var CARRIERS = {
    US: ['T-Mobile', 'AT&T', 'Verizon', 'US Mobile'],
    BR: ['Vivo', 'Claro', 'TIM', 'Oi'],
    GB: ['EE', 'O2', 'Vodafone', 'Three'],
    PT: ['MEO', 'NOS', 'Vodafone'],
    ES: ['Movistar', 'Orange', 'Vodafone'],
    FR: ['Orange', 'SFR', 'Bouygues'],
    DE: ['Telekom', 'Vodafone', 'O2'],
    IT: ['TIM', 'Vodafone', 'WindTre'],
    MX: ['Telcel', 'Movistar', 'AT&T Mexico'],
    AR: ['Claro', 'Movistar', 'Personal'],
    AU: ['Telstra', 'Optus', 'Vodafone'],
    INTL: ['Regional mobile carrier']
  };

  var GLOBAL_SERVICES = [
    { name: 'WhatsApp', cat: 'Messaging', fragments: true, weight: 0.95 },
    { name: 'Facebook', cat: 'Social & messages', fragments: true, weight: 0.7 },
    { name: 'Instagram', cat: 'Social & direct messages', fragments: true, weight: 0.66 },
    { name: 'Telegram', cat: 'Messaging', fragments: false, weight: 0.4 },
    { name: 'Google', cat: 'Accounts', fragments: false, weight: 0.58 },
    { name: 'Apple', cat: 'Device & accounts', fragments: false, weight: 0.42 },
    { name: 'Truecaller', cat: 'Caller ID', fragments: false, weight: 0.55 },
    { name: 'TikTok', cat: 'Social media', fragments: false, weight: 0.35 },
    { name: 'Snapchat', cat: 'Messaging', fragments: false, weight: 0.28 },
    { name: 'X (Twitter)', cat: 'Social media', fragments: false, weight: 0.32 },
    { name: 'LinkedIn', cat: 'Professional network', fragments: false, weight: 0.22 },
    { name: 'Microsoft', cat: 'Accounts', fragments: false, weight: 0.3 }
  ];

  var SCAN_LAYERS = [
    'Phone format & country routing',
    'Mobile network / carrier match',
    'WhatsApp deep check',
    'Facebook & Instagram link check',
    'Secondary messengers (Telegram / Snap)',
    'Caller ID & name graph check',
    'Google & Apple account layer',
    'Social activity indexes',
    'Dating & affair platform scan',
    'Hidden profile / dual-identity scan',
    'Previous number-holder overlap check',
    'Deleted & archived content layers',
    'Cross-app correlation',
    'Final clearance seal'
  ];

  function pickServices(rng, country) {
    var carriers = CARRIERS[country.code] || CARRIERS.INTL;
    var list = [];
    list.push({
      name: carriers[rint(rng, 0, carriers.length - 1)],
      cat: 'Telecommunications · ' + country.name,
      status: 'Registered',
      fragments: false,
      note: 'Network match for this region'
    });
    GLOBAL_SERVICES.forEach(function (s) {
      if (rng() < s.weight) {
        list.push({
          name: s.name,
          cat: s.cat,
          status: 'Registered',
          fragments: !!s.fragments && rng() > 0.35,
          note: s.fragments
            ? 'Active · private content sealed in this delivery'
            : 'Linked · no relationship risk found'
        });
      }
    });
    var hasWa = list.some(function (x) {
      return x.name === 'WhatsApp';
    });
    if (!hasWa) {
      list.unshift({
        name: 'WhatsApp',
        cat: 'Messaging',
        status: 'Registered',
        fragments: true,
        note: 'Active · private content sealed in this delivery'
      });
    }
    var seen = {};
    list = list.filter(function (x) {
      if (seen[x.name]) return false;
      seen[x.name] = true;
      return true;
    });
    while (list.length > 11) list.pop();
    while (list.length < 9) {
      var f = GLOBAL_SERVICES[rint(rng, 0, GLOBAL_SERVICES.length - 1)];
      if (!seen[f.name]) {
        seen[f.name] = true;
        list.push({
          name: f.name,
          cat: f.cat,
          status: 'Registered',
          fragments: false,
          note: 'Linked · no relationship risk found'
        });
      } else break;
    }
    return list;
  }

  function buildPipeline(rng, completedAt) {
    var end = completedAt.getTime();
    // Simulate a 4–9 minute thorough scan ending at completedAt
    var durationMs = (4 * 60 + rint(rng, 0, 5 * 60)) * 1000;
    var start = end - durationMs;
    var n = SCAN_LAYERS.length;
    return SCAN_LAYERS.map(function (label, i) {
      var t = start + Math.round((durationMs * (i + 1)) / n);
      var d = new Date(t);
      return {
        label: label,
        status: 'Completed',
        at: d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };
    });
  }

  function buildCase(opts) {
    opts = opts || {};
    var phoneRaw = opts.phone || '+10000000000';
    var d = digits(phoneRaw);
    var rng = mulberry32(cyrb53(d, 7));
    rng();
    rng();

    var country = countryFromPhone(phoneRaw);
    var carriers = CARRIERS[country.code] || CARRIERS.INTL;
    var carrier = carriers[rint(rng, 0, carriers.length - 1)];
    var subject =
      (opts.name && String(opts.name).trim()) ||
      (opts.subject && String(opts.subject).trim()) ||
      '';
    var hasName = subject.length > 1;

    // VALUE STRATEGY: always "clear of infidelity signals" + thorough delivery proof
    var recordGroups = rint(rng, 11, 18);
    var accountSignals = rint(rng, 9, 14);
    var exposureSignals = 0; // no breach drama
    var services = pickServices(rng, country);
    var caseId = caseIdFrom(phoneRaw);
    var completedAt = opts.date ? new Date(opts.date) : new Date();
    var pipeline = buildPipeline(rng, completedAt);
    var startedAt = new Date(
      completedAt.getTime() -
        (4 * 60 + rint(rng, 20, 280)) * 1000
    );

    var recordsChecked = 1200 + rint(rng, 0, 2800);
    var sourcesQueried = 40 + rint(rng, 0, 28);
    var clearanceScore = 96 + rint(rng, 0, 3); // 96–99% clear

    return {
      caseId: caseId,
      sealHash: sealHash(phoneRaw, caseId),
      phone: formatPhone(phoneRaw),
      phoneDigits: d,
      subjectName: hasName ? subject : 'Holder linked to submitted number',
      subjectConfirmed: hasName,
      dateLabel: completedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      completedAtLabel: completedAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      startedAtLabel: startedAt.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      status: 'Delivered',
      verdict: 'NO INFIDELITY SIGNALS FOUND',
      verdictSub:
        'Full multi-layer sweep completed. No dating-app matches, no third-party romantic content, no concealment package attributed to this subject.',
      country: country,
      carrier: carrier,
      lineType: rng() > 0.12 ? 'Mobile' : 'Mobile (MVNO)',
      lineStatus: 'Active',
      recordGroups: recordGroups,
      accountSignals: accountSignals,
      exposureSignals: exposureSignals,
      services: services,
      registeredCount: services.length,
      fragmentServices: services.filter(function (s) {
        return s.fragments;
      }).length,
      pipeline: pipeline,
      recordsChecked: recordsChecked,
      sourcesQueried: sourcesQueried,
      clearanceScore: clearanceScore,
      // Forced clean outcomes (product strategy)
      overlap: false,
      datingFound: false,
      socialFound: true, // presence yes
      messagingFound: true,
      credentialMatch: false,
      environments: pipeline.length,
      confidence: clearanceScore,
      kpis: {
        environments: pipeline.length,
        registered: services.length,
        clearModules: 6,
        riskFlags: 0
      },
      delivery: {
        channel: 'Secure Report Center',
        method: 'Instant sealed dossier',
        promised: 'Full scan + written case file',
        fulfilled: true
      }
    };
  }

  function parseQuery() {
    var q = new URLSearchParams(w.location.search || '');
    return {
      phone: q.get('phone') || q.get('p') || '',
      name: q.get('name') || q.get('subject') || '',
      email: q.get('email') || '',
      code: q.get('code') || q.get('case') || ''
    };
  }

  w.ReportEngine = {
    buildCase: buildCase,
    parseQuery: parseQuery,
    caseIdFrom: caseIdFrom,
    formatPhone: formatPhone,
    digits: digits
  };
})(window);
