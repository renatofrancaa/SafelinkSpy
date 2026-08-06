# Welcome Purchase — LIVE

## Flow

```
PerfectPay approved
  → app /api/webhooks/perfectpay
  → notifyN8nPurchase
       ├─ N8N_PURCHASE_WEBHOOK_URL  (mark purchased / stop other sequences)
       └─ N8N_WELCOME_WEBHOOK_URL   (this workflow)
            → W1 immediate
            → Wait 3h → W2
            → Wait 1d → W3
            → Wait 2d → W4
            → Wait 3d → W5
```

## n8n

| Item | Value |
|------|--------|
| Workflow | **Welcome Purchase — 5 Emails** |
| Webhook | `https://infosd.app.n8n.cloud/webhook/purchase-welcome` |
| From | `App Spy <noreply@mysafelinkspy.com>` |
| Reply-To | `support@mysafelinkspy.com` |
| Resend | Header Auth account |

## Vercel Production

```
N8N_WELCOME_WEBHOOK_URL=https://infosd.app.n8n.cloud/webhook/purchase-welcome
```

## Manual test

```bash
curl -X POST "https://infosd.app.n8n.cloud/webhook/purchase-welcome" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"seu@email.com\",\"name\":\"Test\",\"purchased\":true}"
```

Use a real inbox (Resend blocks `@example.com`).
