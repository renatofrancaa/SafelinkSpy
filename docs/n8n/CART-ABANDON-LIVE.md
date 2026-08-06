# Cart Abandoned — LIVE checklist

## n8n Cloud

| Item | Status |
|------|--------|
| Workflow | **Cart Abandoned — 7 Emails Recovery** `NWRgkb2WVRR959gF` |
| Active | ON |
| Webhook | `https://infosd.app.n8n.cloud/webhook/cart-abandoned` |
| Resend | Header Auth account (same as recovery) |
| Sheet | **Cart Abandoned** |
| Stop if purchased | Mark Purchased updates Cart Abandoned too |

## Vercel Production env

```
N8N_CART_WEBHOOK_URL=https://infosd.app.n8n.cloud/webhook/cart-abandoned
```

## Funnel trigger (checkout started only)

**Not** on page view. Only when the user **clicks checkout**:

| Page | Action |
|------|--------|
| `step6.html` | `goCheckout()` → unlock / pay $39 |
| `backredirect.html` | `claimOffer()` → special $29 |

Once per email/session → `POST /api/leads/cart-abandon` → n8n.

If they complete payment, Mark Purchased stops the sequence before (or between) emails.

## Sequence

15 min → A1 $29 → +24h A2 → +24h A3 → +24h A4 $19.50 → +24h A5 → +48h A6 → +48h A7

Checkouts:
- $29 → `PPU38CQEKTG`
- $19.50 → `PPU38CQEO73`

## Manual test

```bash
curl -X POST "https://infosd.app.n8n.cloud/webhook/cart-abandoned" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"seu@email.com\",\"name\":\"Test\",\"phone\":\"1555\"}"
```

Wait ~15 min for email A1 via Resend.
