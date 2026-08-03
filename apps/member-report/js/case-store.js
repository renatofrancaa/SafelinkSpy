/**
 * Case store: 1 scan per purchase email + 1 scan per IP.
 * Revisit (same email or IP) → existing case / waiting screen.
 * Server API /api/case reinforces IP bind across browsers when available.
 */
(function (w) {
  'use strict';

  var KEY = 'zapspy_member_v2';
  var COOKIE_CASE = 'zs_case_id';
  var COOKIE_EMAIL = 'zs_email';
  var COOKIE_DAYS = 30;

  /**
   * false = production: ~2 days + a few hours before full OSINT report unlock.
   * true  = testing only: skip wait and go straight to the dossier.
   */
  var INSTANT_UNLOCK = false;

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function digits(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  function uid() {
    return (
      'c_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function setCookie(name, value, days) {
    try {
      var max = (days || COOKIE_DAYS) * 86400;
      document.cookie =
        name +
        '=' +
        encodeURIComponent(value || '') +
        '; path=/; max-age=' +
        max +
        '; SameSite=Lax';
    } catch (e) {}
  }

  function getCookie(name) {
    try {
      var parts = String(document.cookie || '').split(';');
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].trim();
        if (p.indexOf(name + '=') === 0) {
          return decodeURIComponent(p.slice(name.length + 1));
        }
      }
    } catch (e) {}
    return '';
  }

  function clearCookie(name) {
    try {
      document.cookie = name + '=; path=/; max-age=0; SameSite=Lax';
    } catch (e) {}
  }

  function readyAtFrom(phone, createdMs) {
    if (INSTANT_UNLOCK) return createdMs;
    var d = digits(phone);
    var sum = 0;
    for (var i = 0; i < d.length; i++) sum += d.charCodeAt(i);
    // Always ~2 days + a few hours (2h–11h) so ETA looks natural, not identical
    var days = 2;
    var hours = 2 + (sum % 10);
    return createdMs + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000;
  }

  function accessToken(caseId, phone) {
    var raw = caseId + '|' + digits(phone) + '|zapspy-delivery';
    var h = 0;
    for (var i = 0; i < raw.length; i++) {
      h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(16) + digits(phone).slice(-4);
  }

  function reportUrl(c, origin) {
    var base = (origin || w.location.origin) + '/report.html';
    var u = new URL(base, w.location.href);
    u.searchParams.set('case', c.caseId);
    u.searchParams.set('phone', c.phone);
    if (c.name) u.searchParams.set('name', c.name);
    u.searchParams.set('token', c.token);
    u.searchParams.set('delivered', '1');
    return u.toString();
  }

  function getSessionEmail() {
    var s = read();
    return s.sessionEmail || getCookie(COOKIE_EMAIL) || '';
  }

  function setSessionEmail(email) {
    var s = read();
    s.sessionEmail = String(email || '')
      .trim()
      .toLowerCase();
    write(s);
    setCookie(COOKIE_EMAIL, s.sessionEmail, COOKIE_DAYS);
    return s.sessionEmail;
  }

  function clearSession() {
    var s = read();
    delete s.sessionEmail;
    write(s);
    // Do NOT clear IP/case bind or case cookies — revisit must still hit waiting screen
  }

  function allCases() {
    return read().cases || [];
  }

  function listCases(email) {
    var em = String(email || getSessionEmail() || '')
      .trim()
      .toLowerCase();
    return allCases()
      .filter(function (c) {
        return c.email === em;
      })
      .sort(function (a, b) {
        return b.createdAt - a.createdAt;
      });
  }

  function getPrimaryCase(email) {
    var list = listCases(email);
    // listCases is newest-first
    return list.length ? list[0] : null;
  }

  function hasCase(email) {
    return listCases(email).length > 0;
  }

  function getCase(id) {
    var all = allCases();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id || all[i].caseId === id) return all[i];
    }
    var cookieId = getCookie(COOKIE_CASE);
    if (cookieId) {
      for (var j = 0; j < all.length; j++) {
        if (all[j].id === cookieId || all[j].caseId === cookieId) return all[j];
      }
    }
    return null;
  }

  function getCaseByIp(ip) {
    if (!ip) return null;
    var s = read();
    var map = s.ipIndex || {};
    var caseId = map[ip];
    if (caseId) {
      var c = getCase(caseId);
      if (c) return c;
    }
    var all = allCases();
    for (var i = 0; i < all.length; i++) {
      if (all[i].ip === ip) return all[i];
    }
    return null;
  }

  function bindIp(ip, caseRec) {
    if (!ip || !caseRec) return;
    var s = read();
    s.ipIndex = s.ipIndex || {};
    s.ipIndex[ip] = caseRec.id;
    write(s);
  }

  function persistCaseCookies(c) {
    if (!c) return;
    setCookie(COOKIE_CASE, c.id, COOKIE_DAYS);
    if (c.email) setCookie(COOKIE_EMAIL, c.email, COOKIE_DAYS);
  }

  /**
   * Resolve visitor IP (public). Used for anti-multi-scan.
   */
  function resolveIp() {
    if (resolveIp._cached) return Promise.resolve(resolveIp._cached);
    if (resolveIp._pending) return resolveIp._pending;

    resolveIp._pending = fetch('https://api.ipify.org?format=json', {
      cache: 'no-store'
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        var ip = (d && d.ip) || '';
        if (!ip) throw new Error('no ip');
        resolveIp._cached = ip;
        try {
          localStorage.setItem('zapspy_visitor_ip', ip);
        } catch (e) {}
        return ip;
      })
      .catch(function () {
        try {
          var cached = localStorage.getItem('zapspy_visitor_ip') || '';
          if (cached) {
            resolveIp._cached = cached;
            return cached;
          }
        } catch (e) {}
        // Last resort stable browser key (not real IP, still limits same browser)
        var fallback = 'dev-' + (navigator.userAgent || 'ua').slice(0, 24);
        resolveIp._cached = fallback;
        return fallback;
      })
      .finally(function () {
        resolveIp._pending = null;
      });

    return resolveIp._pending;
  }

  /** Server lookup (same IP, other browser) when API is available */
  function serverLookup(ip) {
    return fetch('/api/case?ip=' + encodeURIComponent(ip || ''), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
      .then(function (r) {
        if (!r.ok) return null;
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.case) return null;
        // Merge into local store
        upsertLocalCase(data.case);
        if (ip) bindIp(ip, data.case);
        persistCaseCookies(data.case);
        return data.case;
      })
      .catch(function () {
        return null;
      });
  }

  function serverRegister(c, ip) {
    return fetch('/api/case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ case: c, ip: ip || c.ip || '' })
    }).catch(function () {
      return null;
    });
  }

  function upsertLocalCase(c) {
    if (!c || !c.id) return;
    var s = read();
    s.cases = s.cases || [];
    var found = false;
    for (var i = 0; i < s.cases.length; i++) {
      if (s.cases[i].id === c.id || s.cases[i].caseId === c.caseId) {
        s.cases[i] = Object.assign({}, s.cases[i], c);
        found = true;
        break;
      }
    }
    if (!found) s.cases.push(c);
    write(s);
  }

  /**
   * Find any existing case for this visitor (email session, cookie, IP local, IP server).
   */
  function findExistingForVisitor(opts) {
    opts = opts || {};
    var email = String(opts.email || getSessionEmail() || '')
      .trim()
      .toLowerCase();
    var ip = opts.ip || resolveIp._cached || '';

    if (email) {
      var byEmail = getPrimaryCase(email);
      if (byEmail) return Promise.resolve(byEmail);
    }

    var byCookie = getCase(getCookie(COOKIE_CASE));
    if (byCookie) return Promise.resolve(byCookie);

    if (ip) {
      var byIp = getCaseByIp(ip);
      if (byIp) return Promise.resolve(byIp);
    }

    var p = ip ? Promise.resolve(ip) : resolveIp();
    return p.then(function (resolvedIp) {
      var local = getCaseByIp(resolvedIp);
      if (local) return local;
      return serverLookup(resolvedIp);
    });
  }

  function createCase(opts) {
    opts = opts || {};
    var email = String(opts.email || getSessionEmail())
      .trim()
      .toLowerCase();
    var phone = String(opts.phone || '').trim();
    var name = String(opts.name || '').trim();
    var ip = opts.ip || resolveIp._cached || '';
    if (!email || !phone) throw new Error('Email and phone required');

    // TEMP: while testing with INSTANT_UNLOCK, skip one-scan locks
    if (!INSTANT_UNLOCK) {
      var existingEmail = getPrimaryCase(email);
      if (existingEmail) {
        var errE = new Error('LIMIT_ONE_SCAN');
        errE.code = 'LIMIT_ONE_SCAN';
        errE.reason = 'email';
        errE.existing = existingEmail;
        throw errE;
      }

      if (ip) {
        var existingIp = getCaseByIp(ip);
        if (existingIp) {
          var errI = new Error('LIMIT_ONE_SCAN_IP');
          errI.code = 'LIMIT_ONE_SCAN_IP';
          errI.reason = 'ip';
          errI.existing = existingIp;
          throw errI;
        }
      }
    }

    var createdAt = Date.now();
    var caseId =
      typeof w.ReportEngine !== 'undefined'
        ? w.ReportEngine.caseIdFrom(phone)
        : 'SLS-' + digits(phone).slice(-6);
    var token = accessToken(caseId, phone);
    var readyAt = readyAtFrom(phone, createdAt);

    var c = {
      id: uid(),
      caseId: caseId,
      token: token,
      email: email,
      phone: phone,
      name: name,
      ip: ip || '',
      createdAt: createdAt,
      readyAt: readyAt,
      status: 'processing'
    };

    var s = read();
    s.cases = s.cases || [];
    s.cases.push(c);
    write(s);
    if (ip) bindIp(ip, c);
    persistCaseCookies(c);
    setSessionEmail(email);
    if (ip) serverRegister(c, ip);
    return c;
  }

  function isReady(c, now) {
    now = now || Date.now();
    if (!c) return false;
    // Instant unlock also applies to old cases stuck on multi-day ETA
    if (INSTANT_UNLOCK) return true;
    return now >= c.readyAt;
  }

  function statusOf(c, now) {
    now = now || Date.now();
    if (!c) return 'unknown';
    if (INSTANT_UNLOCK || now >= c.readyAt) return 'ready';
    if (now - c.createdAt < 8 * 60 * 1000) return 'scanning';
    return 'processing';
  }

  function msRemaining(c, now) {
    now = now || Date.now();
    return Math.max(0, c.readyAt - now);
  }

  function formatCountdown(ms) {
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400);
    s -= d * 86400;
    var h = Math.floor(s / 3600);
    s -= h * 3600;
    var m = Math.floor(s / 60);
    if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function formatDate(ms) {
    try {
      return new Date(ms).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(ms);
    }
  }

  function forceReadySoon(caseId, seconds) {
    var s = read();
    var all = s.cases || [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === caseId || all[i].caseId === caseId) {
        all[i].readyAt = Date.now() + Math.max(0, seconds || 15) * 1000;
        write(s);
        if (all[i].ip) serverRegister(all[i], all[i].ip);
        return all[i];
      }
    }
    return null;
  }

  /** Make case ready immediately */
  function forceReadyNow(caseId) {
    return forceReadySoon(caseId, 0);
  }

  /** Clear all local cases/IP binds/cookies (demo / retest) */
  function resetAllDemo() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem('zapspy_visitor_ip');
    } catch (e) {}
    clearCookie(COOKIE_CASE);
    clearCookie(COOKIE_EMAIL);
    resolveIp._cached = null;
  }

  function isDemoFast() {
    try {
      return new URLSearchParams(w.location.search || '').get('demo') === 'fast';
    } catch (e) {
      return false;
    }
  }

  function isDemoNow() {
    try {
      return new URLSearchParams(w.location.search || '').get('demo') === 'now';
    } catch (e) {
      return false;
    }
  }

  /** Resume path: status URL for a case */
  function statusUrl(c, extraQuery) {
    var q = 'status.html?id=' + encodeURIComponent(c.id);
    if (extraQuery) q += '&' + extraQuery.replace(/^\?/, '').replace(/^&/, '');
    // preserve demo flags
    try {
      var sp = new URLSearchParams(w.location.search || '');
      if (sp.get('demo')) q += (q.indexOf('?') >= 0 ? '&' : '?') + 'demo=' + encodeURIComponent(sp.get('demo'));
    } catch (e) {}
    return q;
  }

  /**
   * Best entry for a returning visitor:
   * - ready → full report (same result as the delivery email link)
   * - otherwise → waiting room on this portal
   */
  function resumeUrl(c, extraQuery) {
    if (!c) return 'index.html';
    if (isReady(c)) return reportUrl(c);
    return statusUrl(c, extraQuery);
  }

  w.CaseStore = {
    INSTANT_UNLOCK: INSTANT_UNLOCK,
    getSessionEmail: getSessionEmail,
    setSessionEmail: setSessionEmail,
    clearSession: clearSession,
    listCases: listCases,
    getPrimaryCase: getPrimaryCase,
    hasCase: hasCase,
    getCase: getCase,
    getCaseByIp: getCaseByIp,
    createCase: createCase,
    isReady: isReady,
    statusOf: statusOf,
    msRemaining: msRemaining,
    formatCountdown: formatCountdown,
    formatDate: formatDate,
    reportUrl: reportUrl,
    statusUrl: statusUrl,
    resumeUrl: resumeUrl,
    accessToken: accessToken,
    forceReadySoon: forceReadySoon,
    forceReadyNow: forceReadyNow,
    resetAllDemo: resetAllDemo,
    isDemoFast: isDemoFast,
    isDemoNow: isDemoNow,
    readyAtFrom: readyAtFrom,
    resolveIp: resolveIp,
    findExistingForVisitor: findExistingForVisitor,
    persistCaseCookies: persistCaseCookies,
    serverLookup: serverLookup
  };
})(window);
