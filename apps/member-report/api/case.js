/**
 * IP-bound case registry (best-effort on serverless).
 * POST { case, ip } — register scan for IP
 * GET  ?ip= — lookup existing case for IP
 *
 * Note: in-memory store resets on cold start. Client also stores IP+cookie.
 * For production durability, swap global store for Redis/DB.
 */

const globalStore = globalThis.__zapspyCases || (globalThis.__zapspyCases = {
  byIp: Object.create(null),
  byId: Object.create(null)
});

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim();
  }
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.length) return real.trim();
  return '';
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  // CORS for same-origin usually fine; allow GET/POST
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const headerIp = clientIp(req);

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const ip = (url.searchParams.get('ip') || headerIp || '').trim();
    if (!ip) return send(res, 200, { case: null });
    const id = globalStore.byIp[ip];
    const c = id ? globalStore.byId[id] : null;
    return send(res, 200, { case: c || null, ip: ip });
  }

  if (req.method === 'POST') {
    let body = '';
    await new Promise((resolve) => {
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on('end', resolve);
    });
    let data = {};
    try {
      data = JSON.parse(body || '{}');
    } catch (e) {
      return send(res, 400, { error: 'invalid json' });
    }
    const c = data.case;
    if (!c || !c.id) return send(res, 400, { error: 'case required' });
    const ip = String(data.ip || headerIp || c.ip || '').trim();
    c.ip = ip || c.ip || '';

    // If IP already bound to another case, return existing (do not overwrite)
    if (ip && globalStore.byIp[ip] && globalStore.byIp[ip] !== c.id) {
      const existing = globalStore.byId[globalStore.byIp[ip]];
      if (existing) return send(res, 200, { case: existing, limited: true });
    }

    globalStore.byId[c.id] = c;
    if (ip) globalStore.byIp[ip] = c.id;
    return send(res, 200, { ok: true, case: c });
  }

  return send(res, 405, { error: 'method not allowed' });
};
