#!/usr/bin/env python3
"""Add click feedback text on Accept / Decline for up1–up4."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "public" / "upsell"

ACCEPT_MSG = "Please wait…"
DECLINE_MSG = "Loading basic dashboard..."


def patch_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8")

    # After preventDefault in goCheckout, set feedback + single-flight
    old_start = """  function goCheckout(ev) {
    try {
      if (ev && ev.preventDefault) ev.preventDefault();
    } catch (e0) {}

    try {
      if (typeof fbq === 'function') {"""

    new_start = f"""  function goCheckout(ev) {{
    try {{
      if (ev && ev.preventDefault) ev.preventDefault();
    }} catch (e0) {{}}

    // Single-flight + visual feedback (avoid multi-click)
    if (window.__slAcceptBusy) return;
    window.__slAcceptBusy = true;
    try {{
      var yesEl = document.getElementById('cta-yes');
      if (yesEl) {{
        yesEl.style.pointerEvents = 'none';
        yesEl.setAttribute('aria-busy', 'true');
        yesEl.textContent = {ACCEPT_MSG!r};
      }}
      var noEl = document.getElementById('cta-no');
      if (noEl) noEl.style.pointerEvents = 'none';
    }} catch (eUi) {{}}

    try {{
      if (typeof fbq === 'function') {{"""

    if old_start not in text:
        raise SystemExit(f"{path.name}: goCheckout start not found")
    text = text.replace(old_start, new_start, 1)

    # goNext: feedback + single-flight at start
    old_next = """  function goNext(){
    if (!NEXT) return;
    try {
      if (window.ZSAnalytics && ZSAnalytics.upsellDecline) {"""

    # tier is in the upsellDecline line - keep as wildcard via regex
    text2, n = re.subn(
        r"  function goNext\(\)\{\n    if \(!NEXT\) return;\n    try \{\n      if \(window\.ZSAnalytics && ZSAnalytics\.upsellDecline\) \{",
        f"""  function goNext(){{
    if (!NEXT) return;
    if (window.__slDeclineBusy) return;
    window.__slDeclineBusy = true;
    try {{
      var noEl2 = document.getElementById('cta-no');
      if (noEl2) {{
        noEl2.disabled = true;
        noEl2.style.pointerEvents = 'none';
        noEl2.setAttribute('aria-busy', 'true');
        noEl2.textContent = {DECLINE_MSG!r};
      }}
      var yesEl2 = document.getElementById('cta-yes');
      if (yesEl2) yesEl2.style.pointerEvents = 'none';
    }} catch (eDecUi) {{}}
    try {{
      if (window.ZSAnalytics && ZSAnalytics.upsellDecline) {{""",
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"{path.name}: goNext patch failed ({n})")

    path.write_text(text2, encoding="utf-8", newline="\n")
    s = path.read_text(encoding="utf-8")
    assert ACCEPT_MSG in s, path.name
    assert DECLINE_MSG in s, path.name
    assert "function showOffer" in s, path.name
    print("OK", path.name)


def main():
    for t in ("up1", "up2", "up3", "up4"):
        patch_file(ROOT / f"{t}.html")
    print("DONE")


if __name__ == "__main__":
    main()
