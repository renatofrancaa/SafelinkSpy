#!/usr/bin/env python3
"""Harden upsell accept: clean checkout URL + unlock retry if redirect fails."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "public" / "upsell"

HELPER = r'''
  /**
   * Build a SAFE CenterPag URL.
   * Do NOT dump every query param from the upsell page (PerfectPay return
   * params / huge FB payloads break or freeze checkout).
   */
  var CHECKOUT_ALLOW = {
    name: 1, email: 1, phone: 1,
    utm_source: 1, utm_medium: 1, utm_campaign: 1, utm_content: 1, utm_term: 1, utm_id: 1,
    fbclid: 1, gclid: 1, wbraid: 1, gbraid: 1, gad_source: 1,
    xcod: 1, sck: 1,
    plan: 1, upsell: 1
  };

  function buildCleanCheckoutUrl(code, extra) {
    var base = 'https://go.centerpag.com/' + String(code || '');
    var params = new URLSearchParams();
    try { params.set('upsell', 'true'); } catch (e0) {}

    function put(k, v) {
      if (!k || v == null) return;
      var s = String(v).trim();
      if (!s) return;
      if (s.length > 200) s = s.slice(0, 200);
      try { params.set(k, s); } catch (e) {}
    }

    try {
      var bag = typeof slCaptureUtms === 'function' ? slCaptureUtms() : (typeof slGetUtms === 'function' ? slGetUtms() : {});
      Object.keys(bag || {}).forEach(function (k) {
        if (CHECKOUT_ALLOW[k]) put(k, bag[k]);
      });
    } catch (e1) {}

    try {
      var q = new URLSearchParams(location.search || '');
      q.forEach(function (v, k) {
        if (CHECKOUT_ALLOW[k] && !params.has(k)) put(k, v);
      });
    } catch (e2) {}

    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (CHECKOUT_ALLOW[k] || k === 'plan' || k === 'upsell') put(k, extra[k]);
      });
    }

    var url = base + '?' + params.toString();
    if (url.length > 1800) {
      var slim = new URLSearchParams();
      slim.set('upsell', 'true');
      ['name', 'email', 'phone', 'utm_source', 'utm_medium', 'utm_campaign', 'plan'].forEach(function (k) {
        if (params.has(k)) slim.set(k, params.get(k));
      });
      url = base + '?' + slim.toString();
    }
    if (url.length > 1800) url = base + '?upsell=true';
    return url;
  }

'''


def make_go_checkout(tier: str, cta_fallback: str) -> str:
    title = tier[0].upper() + tier[1:]
    flag = f"__sl{title}CheckoutStarted"
    stage = f"upsell{tier[2:]}"
    return f"""  /**
   * Accept → CenterPag (clean URL, no block, recoverable if redirect fails).
   */
  function goCheckout(ev) {{
    try {{
      if (ev && ev.preventDefault) ev.preventDefault();
    }} catch (e0) {{}}

    if (window.{flag}) return;
    window.{flag} = true;

    var btn = document.getElementById('cta-yes');
    var originalText = '{cta_fallback}';
    if (btn) {{
      try {{
        if (btn.getAttribute('data-cta-label')) originalText = btn.getAttribute('data-cta-label');
        else {{
          originalText = (btn.textContent || originalText).trim() || originalText;
          btn.setAttribute('data-cta-label', originalText);
        }}
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.style.pointerEvents = 'none';
        btn.textContent = 'Redirecting to secure checkout...';
      }} catch (eBtn) {{}}
    }}

    var name = '';
    var email = '';
    var phone = '';
    try {{
      name = sessionStorage.getItem('buyer_name') || '';
      email = sessionStorage.getItem('buyer_email') || '';
      phone =
        sessionStorage.getItem('sl_phone') ||
        sessionStorage.getItem('buyer_phone') ||
        '';
    }} catch (eSs) {{}}

    // Prefer clean URL — never forward PerfectPay return junk from the page query
    var bareUrl = 'https://go.centerpag.com/' + CODE + '?upsell=true';
    var checkoutUrl = bareUrl;
    try {{
      checkoutUrl = buildCleanCheckoutUrl(CODE, {{
        name: name,
        email: email,
        phone: phone,
        plan: '{tier}',
        upsell: 'true'
      }});
    }} catch (eUrl) {{
      checkoutUrl = bareUrl;
    }}

    try {{
      if (typeof fbq === 'function') {{
        fbq('track', 'InitiateCheckout', {{
          value: VALUE,
          currency: 'USD',
          content_name: LABEL,
          content_ids: [CODE],
          content_type: 'product'
        }});
      }}
    }} catch (eFbq) {{}}
    try {{
      if (window.ZSAnalytics && typeof window.ZSAnalytics.track === 'function') {{
        window.ZSAnalytics.track(
          'checkout_click',
          {{
            value: VALUE,
            tier: '{tier}',
            planLabel: LABEL,
            code: CODE,
            action: 'accept'
          }},
          '{stage}'
        );
      }} else if (navigator.sendBeacon) {{
        var body = JSON.stringify({{
          event: 'checkout_click',
          type: 'checkout_click',
          stage: '{stage}',
          checkoutValue: VALUE,
          checkoutTier: '{tier}',
          planLabel: LABEL,
          meta: {{ code: CODE, tier: '{tier}', value: VALUE }}
        }});
        navigator.sendBeacon(
          '/api/analytics/event',
          new Blob([body], {{ type: 'application/json' }})
        );
      }}
    }} catch (eZs) {{}}

    function leave(url) {{
      try {{
        var w = window.top || window;
        w.location.href = url;
      }} catch (e1) {{
        try {{ window.location.assign(url); }} catch (e2) {{
          try {{ window.location.href = url; }} catch (e3) {{}}
        }}
      }}
    }}

    leave(checkoutUrl);

    // Retry with bare URL, then unlock CTA if still on page (in-app browser / block)
    setTimeout(function () {{
      try {{
        if (document.hidden) return;
        leave(bareUrl);
      }} catch (eR) {{}}
    }}, 900);

    setTimeout(function () {{
      try {{
        if (document.hidden) return;
        window.{flag} = false;
        if (btn) {{
          btn.disabled = false;
          btn.style.pointerEvents = '';
          btn.removeAttribute('aria-busy');
          btn.textContent = originalText || '{cta_fallback}';
        }}
      }} catch (eUnlock) {{}}
    }}, 2500);
  }}
"""


CTAS = {
    "up1": "Yes, Add Message Recovery to My Account",
    "up2": "Yes, Add Invisibility Cloak to My Account",
    "up3": "Yes, Add Social Networks + GPS to My Account",
    "up4": "Yes, Add VIP Priority to My Account",
}


def patch(tier: str) -> None:
    path = ROOT / f"{tier}.html"
    text = path.read_text(encoding="utf-8")

    # Insert helper before goCheckout if missing
    if "buildCleanCheckoutUrl" not in text:
        text2, n = re.subn(
            r"(  /\*\*\n   \* Accept → CenterPag)",
            HELPER + r"\1",
            text,
            count=1,
        )
        if n != 1:
            # try alternate comment style
            text2, n = re.subn(
                r"(  function goCheckout\(ev\) \{)",
                HELPER + r"\1",
                text,
                count=1,
            )
            if n != 1:
                raise SystemExit(f"{tier}: could not insert helper")
        text = text2

    # Replace entire goCheckout function
    text2, n = re.subn(
        r"  /\*\*[\s\S]*?\*/\n  function goCheckout\(ev\) \{[\s\S]*?\n  \}\n\n  // Decline",
        make_go_checkout(tier, CTAS[tier]) + "\n  // Decline",
        text,
        count=1,
    )
    if n != 1:
        text2, n = re.subn(
            r"  function goCheckout\(ev\) \{[\s\S]*?\n  \}\n\n  // Decline",
            make_go_checkout(tier, CTAS[tier]) + "\n  // Decline",
            text,
            count=1,
        )
    if n != 1:
        raise SystemExit(f"{tier}: goCheckout replace failed ({n})")

    path.write_text(text2, encoding="utf-8", newline="\n")
    print("OK", path.name)


def main():
    for t in ("up1", "up2", "up3", "up4"):
        patch(t)
    print("DONE")


if __name__ == "__main__":
    main()
