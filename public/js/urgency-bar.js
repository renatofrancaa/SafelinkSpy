/**
 * Sticky top bar: ACCESS EXPIRES IN mm:ss + slots remaining
 * Shared across all funnel steps (same 15 min countdown via localStorage).
 */
(function () {
  'use strict';

  if (window.__slUrgencyBarLoaded) return;
  window.__slUrgencyBarLoaded = true;

  var DURATION = 15 * 60 * 1000;
  var COUNTDOWN_KEY = 'sl_accessExpiresAt';
  var SLOTS_KEY = 'sl_accessSlots';

  // --- styles ---
  var css = document.createElement('style');
  css.textContent = [
    '.urgency-bar{position:fixed;top:0;left:0;right:0;z-index:99999;',
    'background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);',
    'border-bottom:1px solid rgba(37,211,102,.22);',
    'padding:9px 16px;display:flex;align-items:center;justify-content:center;gap:10px;',
    'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    'animation:ub-slide .4s ease;}',
    '.urgency-bar *{margin:0;padding:0;box-sizing:border-box;}',
    '@keyframes ub-slide{from{transform:translateY(-100%)}to{transform:translateY(0)}}',
    '@keyframes ub-pulse{0%,100%{opacity:1}50%{opacity:.3}}',
    '@keyframes ub-flash{0%,100%{opacity:1}50%{opacity:.55}}',
    '.ub-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;',
    'animation:ub-pulse 1.5s ease infinite;flex-shrink:0;box-shadow:0 0 8px rgba(34,197,94,.55);}',
    '.ub-label{font-size:11px;font-weight:700;color:rgba(255,255,255,.65);',
    'text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;}',
    '.ub-timer{font-size:16px;font-weight:900;color:#ef4444;font-variant-numeric:tabular-nums;',
    'letter-spacing:.06em;white-space:nowrap;}',
    '.ub-timer.ub-urgent{animation:ub-flash 1s ease infinite;}',
    '.ub-sep{width:1px;height:16px;background:rgba(255,255,255,.12);flex-shrink:0;}',
    '.ub-slots{font-size:11px;color:rgba(255,255,255,.5);white-space:nowrap;}',
    '.ub-slots strong{color:#ef4444;font-weight:800;}',
    '@media(max-width:400px){.ub-label{font-size:10px;letter-spacing:.04em;}.ub-timer{font-size:14px;}}'
  ].join('');
  document.head.appendChild(css);

  // --- countdown state (shared across ALL funnel pages + backredirect) ---
  // Never restart if a valid deadline already exists.
  var stored = parseInt(localStorage.getItem(COUNTDOWN_KEY), 10);
  if (!stored || isNaN(stored)) {
    // only create once for the whole funnel session
    stored = Date.now() + DURATION;
    try {
      localStorage.setItem(COUNTDOWN_KEY, String(stored));
      localStorage.setItem(SLOTS_KEY, String(Math.floor(Math.random() * 3) + 2)); // 2–4
    } catch (e) {}
  }
  // Mirror to sessionStorage so backredirect can always read the same deadline
  try {
    sessionStorage.setItem(COUNTDOWN_KEY, String(stored));
  } catch (e) {}
  var expiresAt = stored;
  var slots = parseInt(localStorage.getItem(SLOTS_KEY), 10) || 4;
  if (slots < 1) slots = 1;

  // --- DOM ---
  var bar = document.createElement('div');
  bar.className = 'urgency-bar';
  bar.id = 'urgency-bar';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  bar.innerHTML =
    '<span class="ub-dot" id="ub-dot"></span>' +
    '<span class="ub-label" id="ub-label">Access expires in</span>' +
    '<span class="ub-timer" id="ub-timer">--:--</span>' +
    '<span class="ub-sep"></span>' +
    '<span class="ub-slots"><strong id="ub-slots">' + slots + '</strong> slots remaining</span>';

  function mount() {
    if (document.getElementById('urgency-bar') && document.getElementById('urgency-bar') !== bar) {
      // page already has markup — reuse it
      bar = document.getElementById('urgency-bar');
    } else if (!document.getElementById('urgency-bar')) {
      if (document.body.firstChild) {
        document.body.insertBefore(bar, document.body.firstChild);
      } else {
        document.body.appendChild(bar);
      }
    }

    // Push page content below fixed bar
    var h = bar.offsetHeight || 42;
    var body = document.body;
    var pad = parseInt(window.getComputedStyle(body).paddingTop, 10) || 0;
    // Avoid double-padding if already applied
    if (!body.getAttribute('data-ub-pad')) {
      body.style.paddingTop = pad + h + 'px';
      body.setAttribute('data-ub-pad', '1');
    }

    var timerEl = document.getElementById('ub-timer') || bar.querySelector('.ub-timer');
    var slotsEl = document.getElementById('ub-slots') || bar.querySelector('.ub-slots strong');
    var labelEl = document.getElementById('ub-label') || bar.querySelector('.ub-label');
    var dotEl = document.getElementById('ub-dot') || bar.querySelector('.ub-dot');
    if (slotsEl) slotsEl.textContent = String(slots);

    function tick() {
      var rem = Math.max(0, expiresAt - Date.now());
      var mins = Math.floor(rem / 60000);
      var secs = Math.floor((rem % 60000) / 1000);
      if (timerEl) {
        timerEl.textContent =
          (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
        if (mins < 5) timerEl.classList.add('ub-urgent');
        else timerEl.classList.remove('ub-urgent');
      }
      if (rem > 0) {
        setTimeout(tick, 1000);
      } else {
        if (timerEl) timerEl.textContent = '00:00';
        if (dotEl) {
          dotEl.style.background = '#ef4444';
          dotEl.style.boxShadow = '0 0 8px rgba(239,68,68,.55)';
        }
        if (labelEl) {
          labelEl.textContent = 'Access expired';
          labelEl.style.color = '#ef4444';
        }
        bar.style.background = 'linear-gradient(135deg,#1a0a0a 0%,#2a1010 100%)';
        bar.style.borderBottom = '1px solid rgba(239,68,68,.4)';
      }
    }
    tick();

    setInterval(function () {
      if (slots > 1 && Math.random() < 0.18) {
        slots--;
        try {
          localStorage.setItem(SLOTS_KEY, String(slots));
        } catch (e) {}
        if (slotsEl) slotsEl.textContent = String(slots);
      }
    }, 14000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
