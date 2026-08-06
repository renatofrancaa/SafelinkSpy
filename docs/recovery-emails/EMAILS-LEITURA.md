# 4 e-mails recovery — texto completo (para ler)

**From:** App Spy <noreply@mysafelinkspy.com>  
**Sample lead:** Renato · +55 11 99999-9999

Abra no browser (HTML visual):
- `docs/recovery-emails/e1-preview.html`
- `docs/recovery-emails/e2-preview.html`
- `docs/recovery-emails/e3-preview.html`
- `docs/recovery-emails/e4-preview.html`

---

## EMAIL 1 — ~30 min · $39

**Subject:** Renato, data recovery completed for +55 11 99999-9999

**Headline:** Renato, we recovered the number you entered

**Body:**
- ✅ Recovery finished for +55 11 99999-9999
- You started the unlock — then left before opening the full report. Everything we found is still saved. You only need to finish checkout.
- What's waiting: deleted messages, photos/media blurred, location history, hidden contacts
- Most people who come back say: "I just needed to know." You already did the hard part — the scan.

**Offer:** $197 → **$39** · one-time · lifetime · 30-day guarantee  
**CTA:** Open My Full Report Now  
**Checkout:** PPU38CQEHD1 (step6) · utm_campaign=e1

---

## EMAIL 2 — +24 h · $39

**Subject:** Renato — deleted messages for +55 11 99999-9999 are still locked

**Headline:** Renato, deleted messages don't stay "gone"

**Body:**
- ⚠️ Report for +55 11 99999-9999 is still unread
- Every day you wait is another day of not knowing what was erased.
- People delete messages for a reason. Scan pulled chats/media — full text stays blurred until unlock.
- Teaser: "Don't tell ████ that we ██████…"
- You don't need to confront anyone yet — private, remote, no install on their phone.

**Offer:** $197 → **$39**  
**CTA:** Reveal What They Deleted  
**Checkout:** PPU38CQEHD1 · utm_campaign=e2

---

## EMAIL 3 — +48 h · $39

**Subject:** Renato, your recovery for +55 11 99999-9999 is still waiting

**Headline:** Still sitting with the doubt, Renato?

**Body:**
- If you paused because expensive / awkward / maybe later — normal.
- What you get for less than a dinner: chats+deleted, media, GPS, remote/undetectable, lifetime + 30-day guarantee.
- Not sure? 30 days money-back. Only thing you can't get back is peace of mind if you never look.

**Offer:** $197 → **$39** · BEST VALUE badge  
**CTA:** Yes — Show Me Everything  
**Checkout:** PPU38CQEHD1 · utm_campaign=e3

---

## EMAIL 4 — +72 h · $29 (last)

**Subject:** Renato — last email: unlock +55 11 99999-9999 before we stop

**Headline:** Renato, exclusive $10 off — then silence

**Body:**
- +55 11 99999-9999 is still unprotected
- Last message about this scan — we won't remind you again.
- You already scanned. Close the loop for **$29 once** (was $39). Same product, exit-only price.

**Offer:** $39 → **$29** · Save $10  
**CTA:** Claim $29 Unlock Before We Stop  
**Checkout:** PPU38CQEKTG (backredirect) · utm_campaign=e4

---

## Fluxo n8n (com planilha)

```
Webhook → Normalize → Append sheet → Wait 30m
  → Get row → IF not purchased → Email 1
  → Wait 24h → Get row → IF → Email 2
  → Wait 24h → Get row → IF → Email 3
  → Wait 24h → Get row → IF → Email 4
```

Import:
- `docs/n8n/workflow-lead-recovery-4emails.json`
- `docs/n8n/workflow-mark-purchased.json`

Planilha aba **Leads** + Append em **Auto-map**.
