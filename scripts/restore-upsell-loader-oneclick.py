#!/usr/bin/env python3
"""
Restore upsell loader + price filter + decline, keep exact one-click Accept URLs.
Previous one-click patch accidentally deleted showOffer/setInterval.
"""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
UPSELL = ROOT / "public" / "upsell"

CODES = {
    "up1": ("PPU38CQ94G5", "Yes, Add Message Recovery to My Account", 57, "Message Vault $57", "/upsell/up2.html"),
    "up2": ("PPU38CQ95OL", "Yes, Add Invisibility Cloak to My Account", 45, "Invisibility Cloak $45", "/upsell/up3.html"),
    "up3": ("PPU38CQ95O6", "Yes, Add Social Networks + GPS to My Account", 59, "360 Tracker $59", "/upsell/up4.html"),
    "up4": ("PPU38CQ95OE", "Yes, Add VIP Priority to My Account", 67, "VIP Priority Processing $67", "/upsell/thankyou.html"),
}


def git_show(rel: str) -> str:
    r = subprocess.run(
        ["git", "show", f"HEAD:{rel}"],
        cwd=ROOT,
        capture_output=True,
    )
    return r.stdout.decode("utf-8", errors="replace")


def make_oneclick_go(tier: str, code: str, cta: str) -> str:
    title = tier[0].upper() + tier[1:]
    flag = f"__sl{title}CheckoutStarted"
    stage = f"upsell{tier[2:]}"
    exact = f"https://go.centerpag.com/{code}?upsell=true"
    return f"""  /**
   * ONE-CLICK upsell — exact CenterPag URL only.
   * Exact: {exact}
   * Same for price shown or hidden.
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

    var checkoutUrl = {exact!r};

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

    setTimeout(function () {{
      try {{ if (!document.hidden) leave(checkoutUrl); }} catch (eR) {{}}
    }}, 600);

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


def extract_from_head(old: str) -> tuple[str, str, str]:
    """
    Returns (prefix_before_main_script_iife_content_start_through_constants,
             middle_price_loader_attr,
             suffix_from_goNext)
    Actually simpler: extract block from Price box rule / cookieGet through attributionParams inclusive,
    and extract goNext + bind section from HEAD.
    """
    # From Price box rule comment OR cookieGet through end of attributionParams
    m_mid = re.search(
        r"(  /\*\*\n   \* Price box rule:[\s\S]*?function attributionParams\(extra\) \{[\s\S]*?return fwd;\n  \}\n)",
        old,
    )
    if not m_mid:
        m_mid = re.search(
            r"(  function cookieGet\(name\) \{[\s\S]*?function attributionParams\(extra\) \{[\s\S]*?return fwd;\n  \}\n)",
            old,
        )
    if not m_mid:
        raise RuntimeError("could not extract middle (loader) from HEAD")

    m_next = re.search(
        r"(  // Decline[\s\S]*?\n\}\)\(\);\n</script>\n</body>\n</html>\s*)$",
        old,
    )
    if not m_next:
        m_next = re.search(
            r"(  function goNext\(\)\{[\s\S]*?\n\}\)\(\);\n</script>\n</body>\n</html>\s*)$",
            old,
        )
    if not m_next:
        raise RuntimeError("could not extract goNext/bind from HEAD")

    return m_mid.group(1), m_next.group(1)


def rebuild(tier: str) -> None:
    code, cta, value, label, nxt = CODES[tier]
    rel = f"public/upsell/{tier}.html"
    path = UPSELL / f"{tier}.html"
    cur = path.read_text(encoding="utf-8")
    old = git_show(rel)

    mid, tail_from_head = extract_from_head(old)

    # Prefix: everything up to and including LABEL line inside IIFE
    # Find current file start through LABEL (preserve HTML + sticky UTM head)
    m_pre = re.search(
        r"(.*?<script>\s*\(function\(\)\{\s*"
        r'var CODE = "[^"]+";\s*'
        r'var NEXT = "[^"]+";\s*'
        r"var VALUE = \d+;\s*"
        r'var LABEL = "[^"]*";\s*)',
        cur,
        re.DOTALL,
    )
    if not m_pre:
        raise RuntimeError(f"{tier}: could not find IIFE constants in current file")

    prefix = m_pre.group(1)
    # Fix constants
    prefix = re.sub(r'var CODE = "[^"]+";', f'var CODE = "{code}";', prefix, count=1)
    prefix = re.sub(r'var NEXT = "[^"]+";', f'var NEXT = "{nxt}";', prefix, count=1)
    prefix = re.sub(r"var VALUE = \d+;", f"var VALUE = {value};", prefix, count=1)
    prefix = re.sub(r'var LABEL = "[^"]*";', f'var LABEL = "{label}";', prefix, count=1)

    # Ensure cta button has onclick + correct id (keep current button HTML from cur head)
    # Rebuild goNext/bind with one-click global
    title = tier[0].upper() + tier[1:]
    global_fn = f"__sl{title}GoCheckout"

    # Adapt tail: use goNext from head but ensure bindings include global
    go_next_m = re.search(
        r"(  // Decline[\s\S]*?function goNext\(\)\{[\s\S]*?\n  \}\n)",
        tail_from_head,
    )
    if not go_next_m:
        go_next_m = re.search(
            r"(  function goNext\(\)\{[\s\S]*?\n  \}\n)",
            tail_from_head,
        )
    if not go_next_m:
        raise RuntimeError(f"{tier}: goNext not found in head tail")

    go_next = go_next_m.group(1)
    # Fix tier strings inside goNext if needed (head already has correct tier)

    bind = f"""
  window.{global_fn} = goCheckout;

  var yesBtn = document.getElementById('cta-yes');
  var noBtn = document.getElementById('cta-no');
  if (yesBtn) yesBtn.addEventListener('click', goCheckout);
  if (noBtn) {{
    noBtn.addEventListener('click', function (e) {{
      try {{ e.preventDefault(); }} catch (e1) {{}}
      goNext();
    }});
  }}
}})();
</script>
</body>
</html>
"""

    oneclick = make_oneclick_go(tier, code, cta)

    # Ensure accept button has onclick in HTML portion of prefix... prefix only has script start.
    # Fix button in full current HTML top half
    html_top = cur[: m_pre.start()]
    # Fix CODE in case referenced nowhere else
    html_top = re.sub(
        r'(id="cta-yes"[^>]*)(>)',
        rf'\1 onclick="try{{if(window.{global_fn})window.{global_fn}(event);}}catch(e){{}}"\2',
        html_top,
        count=1,
    )
    # if onclick already there, replace global name
    html_top = re.sub(
        r"window\.__slUp\dGoCheckout",
        f"window.{global_fn}",
        html_top,
    )

    out = (
        html_top
        + prefix
        + "\n"
        + mid
        + "\n"
        + oneclick
        + "\n"
        + go_next
        + bind
    )

    path.write_text(out, encoding="utf-8", newline="\n")

    s = path.read_text(encoding="utf-8")
    assert "function showOffer" in s, tier
    assert "setInterval" in s, tier
    assert "function hasUtmSource" in s, tier
    assert f'var CODE = "{code}"' in s, tier
    assert f"https://go.centerpag.com/{code}?upsell=true" in s, tier
    print(f"OK {tier} loader+oneclick CODE={code}")


def main():
    for tier in ("up1", "up2", "up3", "up4"):
        rebuild(tier)
    print("DONE")


if __name__ == "__main__":
    main()
