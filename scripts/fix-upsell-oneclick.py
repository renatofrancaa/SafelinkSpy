#!/usr/bin/env python3
"""Set exact one-click upsell URLs on Accept buttons (up1–up4)."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "public" / "upsell"

CODES = {
    "up1": ("PPU38CQ94G5", "Yes, Add Message Recovery to My Account"),
    "up2": ("PPU38CQ95OL", "Yes, Add Invisibility Cloak to My Account"),
    "up3": ("PPU38CQ95O6", "Yes, Add Social Networks + GPS to My Account"),
    "up4": ("PPU38CQ95OA", "Yes, Add VIP Priority to My Account"),
}


def make_go_checkout(tier: str, code: str, cta: str) -> str:
    title = tier[0].upper() + tier[1:]
    flag = f"__sl{title}CheckoutStarted"
    stage = f"upsell{tier[2:]}"
    exact = f"https://go.centerpag.com/{code}?upsell=true"
    return f"""  /**
   * ONE-CLICK upsell — exact CenterPag URL only.
   * Do NOT append extra query junk (breaks PerfectPay one-click).
   * Exact: {exact}
   * Same URL whether price is shown or hidden.
   */
  function goCheckout(ev) {{
    try {{ if (ev && ev.preventDefault) ev.preventDefault(); }} catch (e0) {{}}
    if (window.{flag}) return;
    window.{flag} = true;

    var btn = document.getElementById('cta-yes');
    var originalText = {cta!r};
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
        btn.textContent = 'Adding to your account...';
      }} catch (eBtn) {{}}
    }}

    // Exact one-click link (price shown OR hidden — same button action)
    var checkoutUrl = {exact!r};

    // Non-blocking analytics only (never delay redirect)
    try {{
      if (typeof fbq === 'function') {{
        fbq('track', 'InitiateCheckout', {{
          value: VALUE, currency: 'USD',
          content_name: LABEL, content_ids: [CODE], content_type: 'product'
        }});
      }}
    }} catch (eFbq) {{}}
    try {{
      if (window.ZSAnalytics && typeof window.ZSAnalytics.track === 'function') {{
        window.ZSAnalytics.track('checkout_click', {{
          value: VALUE, tier: {tier!r}, planLabel: LABEL, code: CODE,
          action: 'accept', oneClick: true
        }}, {stage!r});
      }} else if (navigator.sendBeacon) {{
        try {{
          navigator.sendBeacon('/api/analytics/event', new Blob([JSON.stringify({{
            event: 'checkout_click', type: 'checkout_click', stage: {stage!r},
            checkoutValue: VALUE, checkoutTier: {tier!r}, planLabel: LABEL,
            meta: {{ code: CODE, tier: {tier!r}, value: VALUE, oneClick: true }}
          }})], {{ type: 'application/json' }}));
        }} catch (eB) {{}}
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

    // Retry exact URL if still on page (in-app browser)
    setTimeout(function () {{
      try {{ if (!document.hidden) leave(checkoutUrl); }} catch (eR) {{}}
    }}, 600);

    // Unlock CTA if one-click navigation failed
    setTimeout(function () {{
      try {{
        if (document.hidden) return;
        window.{flag} = false;
        if (btn) {{
          btn.disabled = false;
          btn.style.pointerEvents = '';
          btn.removeAttribute('aria-busy');
          btn.textContent = originalText || {cta!r};
        }}
      }} catch (eU) {{}}
    }}, 2500);
  }}
"""


def patch(tier: str) -> None:
    code, cta = CODES[tier]
    path = ROOT / f"{tier}.html"
    text = path.read_text(encoding="utf-8")

    text2, n1 = re.subn(
        r'var CODE = "[^"]+";',
        f'var CODE = "{code}";',
        text,
        count=1,
    )
    if n1 != 1:
        raise SystemExit(f"{tier}: CODE replace failed")

    new_fn = make_go_checkout(tier, code, cta)
    text3, n2 = re.subn(
        r"  /\*\*[\s\S]*?\*/\n  function goCheckout\(ev\) \{[\s\S]*?\n  \}\n\n  // Decline",
        new_fn + "\n  // Decline",
        text2,
        count=1,
    )
    if n2 != 1:
        text3, n2 = re.subn(
            r"  function goCheckout\(ev\) \{[\s\S]*?\n  \}\n\n  // Decline",
            new_fn + "\n  // Decline",
            text2,
            count=1,
        )
    if n2 != 1:
        raise SystemExit(f"{tier}: goCheckout replace failed n={n2}")

    path.write_text(text3, encoding="utf-8", newline="\n")
    s = path.read_text(encoding="utf-8")
    exact = f"https://go.centerpag.com/{code}?upsell=true"
    assert f'var CODE = "{code}"' in s, tier
    assert exact in s, tier
    # Ensure we don't call buildCleanCheckoutUrl in goCheckout path as primary
    # (helper may still exist unused — ok)
    print(f"OK {tier} → {exact}")


def main():
    for tier in ("up1", "up2", "up3", "up4"):
        patch(tier)

    # catalog.json
    cat = ROOT / "catalog.json"
    if cat.exists():
        t = cat.read_text(encoding="utf-8")
        t = t.replace("PPU38CQ95OE", "PPU38CQ95OA")
        # ensure codes present
        for code in ("PPU38CQ94G5", "PPU38CQ95OL", "PPU38CQ95O6", "PPU38CQ95OA"):
            if code not in t:
                print("WARN catalog missing", code)
        cat.write_text(t, encoding="utf-8", newline="\n")
        print("OK catalog.json")

    print("DONE")


if __name__ == "__main__":
    main()
