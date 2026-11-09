# Pending: Digistore24 webhook go-live (resume after the products are approved)

Status on 2026-11-09: the Edge Function `digistore-ipn` is deployed in the Supabase project `golden-tool`
(ref `rlnfpgbtlrnitbulvwkh`) and answers at
`https://rlnfpgbtlrnitbulvwkh.supabase.co/functions/v1/digistore-ipn`.
It is NOT live yet: JWT verification is still on and no secrets are set. Nothing else blocks it.

## Owner steps in the Supabase dashboard (Claude is not allowed to do these)
1. Edge Functions → digistore-ipn → Settings → turn OFF "Verify JWT with legacy secret" → Save changes.
2. Edge Functions → Secrets → add:
   - `DIGISTORE_IPN_PASSPHRASE` = the passphrase you set in Digistore24 (any long random string; same value in both places).
     Test value used in the plan: `gt-ipn-0efabe8511ae1e3aa426ba74`
   - `DIGISTORE_PRODUCT_MAP` = JSON of Digistore24 product id → offer, e.g.
     (see mapping below; the front-end product is not in the map)
     Mapping: Golden Freedom → `debts`, Golden Goals → `goals`, Golden Vision → `reports`,
     Lifetime Access (order bump) → `lifetime`, Bundle/downsell (all add-ons) → `all`.
     The front-end product (Golden Tool itself) is NOT in the map: it needs no entitlement.
     Test map used in the plan: `{"1001":"debts","1002":"goals","1003":"reports","1004":"lifetime","1005":"all"}`

## Owner steps in Digistore24
3. Settings → Integrations → IPN → new connection, type "Generic", URL above, SHA512 passphrase = the same value.
   One connection for all products is fine.
4. Thank-you pages: tell the buyer to sign in at the app with the same email used at checkout.
5. Replace the placeholder checkout links in `src/lib/modules.ts` (debts, goals, reports, lifetime, bundle) with the real order-form URLs.

## Claude's test plan (run after 1–3)
From the project folder:
```
node supabase/functions/digistore-ipn/sign-test.mjs '<passphrase>' https://rlnfpgbtlrnitbulvwkh.supabase.co/functions/v1/digistore-ipn \
  event=on_payment email=lucazscales@outlook.com product_id=<debts id> order_id=TEST-1 api_mode=test
```
Run the printed curl → expect `OK`. Then: reload the app signed in as that email → Golden Freedom unlocked
with no code. Then send `event=on_refund` for the same order → locked again. Then a wrong `sha_sign` → 403,
and an unknown `product_id` → OK but nothing granted. Also press "Send test IPN" in Digistore24 → `OK`.

## Upsell pages (site) — wire when the products exist
Pages: `/upsell/` (Golden Freedom $47) → `/upsell2/` (Golden Goals $37) → `/upsell3/` (Golden Vision $27) → `/thank-you/`.
Thank-you page per upsell product (enter these as each add-on product's thank-you URL in the platform; each one shows "added to your order" and a Continue button to the next step):
`/upsell/thank-you/` → continues to `/upsell2/` · `/upsell2/thank-you/` → `/upsell3/` · `/upsell3/thank-you/` → `/thank-you/`.
Each page has a script with `ACCEPT` / `DECLINE` patterns left EMPTY and a session id read from `?upsell_session=` or `?session=`.
When the platform is connected: set ACCEPT to its one-click "yes" URL pattern and DECLINE to the "no" pattern (both with `{sid}`), and make the
page read the platform's own session parameter name. Register each page as the upsell page of the previous product. The owner's rule (2026-11-09):
no visible mention of the payment platform anywhere on the site until the product is live there; CTAs point to `#checkout` until then.
