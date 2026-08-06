#!/usr/bin/env python3
"""Apply non-blocking immediate checkout pattern to up2/up3/up4."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "public" / "upsell"


def make_go_checkout(tier: str) -> str:
    # up2 -> Up2, flag __slUp2CheckoutStarted
    title = tier[0].upper() + tier[1:]
    flag = f"__sl{title}CheckoutStarted"
    global_fn = f"__sl{title}GoCheckout"
    stage = f"upsell{tier[2:]}"
    return f"""  /**
   * Accept → CenterPag.
   * CRITICAL: never block on analytics (sync XHR froze first click).
   */
  function goCheckout(ev) {{
    try {{
      if (ev && ev.preventDefault) ev.preventDefault();
    }} catch (e0) {{}}

    if (window.{flag}) return;
    window.{flag} = true;

    var btn = document.getElementById('cta-yes');
    if (btn) {{
      try {{
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

    var checkoutUrl = 'https://go.centerpag.com/' + CODE + '?upsell=true';
    try {{
      checkoutUrl = buildForwardUrl(
        'https://go.centerpag.com/' + CODE + '?upsell=true',
        attributionParams({{
          name: name,
          email: email,
          phone: phone,
          plan: '{tier}',
          upsell: 'true'
        }})
      );
    }} catch (eUrl) {{
      checkoutUrl = 'https://go.centerpag.com/' + CODE + '?upsell=true';
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

    try {{
      window.location.assign(checkoutUrl);
    }} catch (eNav) {{
      try {{
        window.location.href = checkoutUrl;
      }} catch (eNav2) {{}}
    }}

    setTimeout(function () {{
      try {{
        if (!document.hidden) window.location.href = checkoutUrl;
      }} catch (eRetry) {{}}
    }}, 700);
  }}
"""


def patch_file(tier: str) -> None:
    path = ROOT / f"{tier}.html"
    text = path.read_text(encoding="utf-8")
    title = tier[0].upper() + tier[1:]
    global_fn = f"__sl{title}GoCheckout"

    text2, n = re.subn(
        r"  function goCheckout\(\)\{\n.*?  \}\n\n  // Decline",
        make_go_checkout(tier) + "\n  // Decline",
        text,
        count=1,
        flags=re.DOTALL,
    )
    if n != 1:
        raise SystemExit(f"{tier}: goCheckout replace failed ({n})")

    # Inline onclick on CTA
    text2, n2 = re.subn(
        r'(<button type="button" class="cta-yes JS-initiate-checkout" id="cta-yes")(>)',
        rf'\1 onclick="try{{if(window.{global_fn})window.{global_fn}(event);}}catch(e){{}}"\2',
        text2,
        count=1,
    )
    if n2 != 1:
        raise SystemExit(f"{tier}: button onclick replace failed ({n2})")

    # Expose global + keep addEventListener
    old_bind = """  var yesBtn = document.getElementById('cta-yes');
  var noBtn = document.getElementById('cta-no');
  if (yesBtn) yesBtn.addEventListener('click', goCheckout);"""
    new_bind = f"""  window.{global_fn} = goCheckout;

  var yesBtn = document.getElementById('cta-yes');
  var noBtn = document.getElementById('cta-no');
  if (yesBtn) yesBtn.addEventListener('click', goCheckout);"""
    if old_bind not in text2:
        raise SystemExit(f"{tier}: bind block not found")
    text2 = text2.replace(old_bind, new_bind, 1)

    path.write_text(text2, encoding="utf-8", newline="\n")
    print(f"OK {path.name}")


def main():
    for tier in ("up2", "up3", "up4"):
        patch_file(tier)
    print("DONE")


if __name__ == "__main__":
    main()
