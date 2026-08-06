# Email UTM standard (UTMify / PerfectPay)

Like Reportana `rptn` — **fonte** = `utm_source` (and `src` for PerfectPay).

| Flow | utm_source | utm_medium | utm_campaign | src | sck |
|------|------------|------------|--------------|-----|-----|
| Lead recovery | `email_recovery` | `email` | `e1`…`e4` | `email_recovery` | same as campaign |
| Cart abandon | `email_cart` | `email` | `cart_a1`…`cart_a7` or `a1`… | `email_cart` | campaign |
| Card refused | `email_cancel` | `email` | `cancel_e1`… | `email_cancel` | campaign |
| Welcome | `email_welcome` | `email` | `w1`…`w5` | `email_welcome` | campaign |

UTMify **Vendas por Fonte** should show: `email_recovery`, `email_cart`, `email_cancel`, `email_welcome`.
