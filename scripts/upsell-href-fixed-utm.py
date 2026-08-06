#!/usr/bin/env python3
"""Accept CTA = fixed href (hover shows exact link) + JS appends UTMs on click."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "public" / "upsell"

CONFIG = {
    "up1": {
        "code": "PPU38CQ94G5",
        "plan": "up1",
        "label_html": "Yes, Add Message Recovery to My Account",
    },
    "up2": {
        "code": "PPU38CQ95OL",
        "plan": "up2",
        "label_html": "Yes, Add Invisibility Cloak to My Account",
    },
    "up3": {
        "code": "PPU38CQ95O6",
        "plan": "up3",
        "label_html": "Yes, Add Social Networks + GPS to My Account",
    },
    "up4": {
        "code": "PPU38CQ95OE",
        "plan": "up4",
        "label_html": "Yes, Add VIP Priority to My Account",
    },
}


def make_go_checkout(plan: str, code: str) -> str:
    exact = f"https://go.centerpag.com/{code}?upsell=true"
    return f"""  /**
   * Accept: href on the <a> is the exact one-click URL (visible on hover).
   * On click we only APPEND UTMs / buyer fields — never change product code.
   * Base: {exact}
   */
  function goCheckout(ev) {{
    try {{
      if (ev && ev.preventDefault) ev.preventDefault();
    }} catch (e0) {{}}

    try {{
      if (typeof fbq === 'function') {{
        fbq('track', 'InitiateCheckout', {{
          value: VALUE, currency: 'USD',
          content_name: LABEL, content_ids: [CODE], content_type: 'product'
        }});
      }}
    }} catch (e) {{}}
    try {{
      if (window.ZSAnalytics && ZSAnalytics.checkout) {{
        ZSAnalytics.checkout({{ tier: {plan!r}, value: VALUE, planLabel: LABEL, code: CODE }});
      }}
    }} catch (e) {{}}

    var name = sessionStorage.getItem('buyer_name') || '';
    var email = sessionStorage.getItem('buyer_email') || '';
    var phone = sessionStorage.getItem('sl_phone') || sessionStorage.getItem('buyer_phone') || '';

    // Exact product URL from the anchor href (fallback to CODE)
    var base = {exact!r};
    try {{
      var a = document.getElementById('cta-yes');
      if (a && a.getAttribute('href')) base = a.getAttribute('href');
    }} catch (eH) {{}}

    // Append UTMs + buyer data only — product path stays fixed
    setTimeout(function () {{
      try {{
        navigateWithQuery(base, attributionParams({{
          name: name,
          email: email,
          phone: phone,
          plan: {plan!r},
          upsell: 'true'
        }}));
      }} catch (eNav) {{
        try {{ window.location.href = base; }} catch (e2) {{}}
      }}
    }}, 400);
  }}
"""


def patch(tier: str) -> None:
    cfg = CONFIG[tier]
    code = cfg["code"]
    plan = cfg["plan"]
    label = cfg["label_html"]
    exact = f"https://go.centerpag.com/{code}?upsell=true"
    path = ROOT / f"{tier}.html"
    text = path.read_text(encoding="utf-8")

    # CSS: style <a.cta-yes> like button
    text = text.replace(
        "button.cta-yes#cta-yes{",
        "a.cta-yes#cta-yes,\nbutton.cta-yes#cta-yes{",
    )
    if "a.cta-yes{text-decoration:none" not in text and "text-decoration:none;color:#fff" not in text:
        text = text.replace(
            ".cta-yes{\n  display:block;width:100%;border:none;border-radius:14px;padding:1.1rem 1.1rem;\n  background:linear-gradient(180deg,#2fe072,var(--g));color:#fff;font-family:inherit;",
            ".cta-yes{\n  display:block;width:100%;border:none;border-radius:14px;padding:1.1rem 1.1rem;\n  background:linear-gradient(180deg,#2fe072,var(--g));color:#fff!important;font-family:inherit;\n  text-decoration:none;text-align:center;box-sizing:border-box;",
        )

    # Button → anchor with fixed href
    btn_re = re.compile(
        r'<button type="button" class="cta-yes JS-initiate-checkout" id="cta-yes">[^<]*</button>'
    )
    new_a = (
        f'<a href="{exact}" class="cta-yes JS-initiate-checkout" id="cta-yes" '
        f'rel="noopener noreferrer">{label}</a>'
    )
    text2, n_btn = btn_re.subn(new_a, text, count=1)
    if n_btn != 1:
        raise SystemExit(f"{tier}: button replace failed ({n_btn})")

    # Replace goCheckout function
    text3, n_go = re.subn(
        r"  function goCheckout\(\)\{\n.*?  \}\n\n  // Decline",
        make_go_checkout(plan, code) + "\n  // Decline",
        text2,
        count=1,
        flags=re.DOTALL,
    )
    if n_go != 1:
        raise SystemExit(f"{tier}: goCheckout replace failed ({n_go})")

    # Ensure CODE still matches
    if f'var CODE = "{code}"' not in text3:
        text3 = re.sub(
            r'var CODE = "[^"]+";',
            f'var CODE = "{code}";',
            text3,
            count=1,
        )

    path.write_text(text3, encoding="utf-8", newline="\n")

    s = path.read_text(encoding="utf-8")
    assert f'href="{exact}"' in s, tier
    assert "function goCheckout" in s, tier
    assert "function showOffer" in s, tier
    assert "getAttribute('href')" in s, tier
    print(f"OK {tier} href={exact}")


def main():
    for t in ("up1", "up2", "up3", "up4"):
        patch(t)
    print("DONE")


if __name__ == "__main__":
    main()
