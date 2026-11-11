# digistore-ipn

Receives Digistore24 IPNs and writes `entitlements` rows (by buyer email). Contract: [IPN guide](https://www.digistore24.com/download/ipn/examples/ipn/digistore_ipn.pdf) and [example receiver](https://www.digistore24.com/download/ipn/examples/ipn/ipn_receiver.php).

| Digistore24 event | Effect |
|---|---|
| `on_payment` (also each rebill) | row `active` |
| `on_refund`, `on_chargeback`, `on_payment_missed` | row `refunded` (inserted if missing) |
| `connection_test`, anything else, unknown `product_id` | `200 OK`, ignored (logged) |

Bad signature: 403. Missing email/order_id: 400. DB failure: 500 (Digistore24 retries).

## Secrets

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase secrets set \
  DIGISTORE_IPN_PASSPHRASE='the-passphrase-you-set-in-digistore24' \
  DIGISTORE_PRODUCT_MAP='{"12345":"all","12346":"debts","12347":"goals","12348":"reports"}'
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically. Product IDs are the numbers in Digistore24 (Products -> edit product). Values: `all|debts|goals|reports`.

Testing without a passphrase: leave `DIGISTORE_IPN_PASSPHRASE` empty and set `ALLOW_UNSIGNED_IPN=true`. Remove it before launch.

## Deploy

```bash
npx supabase functions deploy digistore-ipn --no-verify-jwt
```

`--no-verify-jwt` is required: Digistore24 sends no Supabase token. Security comes from `sha_sign`.

URL for Digistore24: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/digistore-ipn`

## Digistore24 setup

Settings -> Integrations -> IPN -> add connection, type "Generic". URL as above, same passphrase in the "SHA512" field, events: payment, refund, chargeback, payment missed (plus rebill if you sell subscriptions). Timing: "Before redirect to thankyou page" (so the add-on is ready when the buyer lands in the app). One connection can cover all products, or add one per product. Use "Send test IPN" there to check the connection.

## Signed test

```bash
node supabase/functions/digistore-ipn/sign-test.mjs 'the-passphrase' \
  https://YOUR-PROJECT-REF.supabase.co/functions/v1/digistore-ipn \
  event=on_payment email=buyer@example.com product_id=12346 order_id=TEST-1
```

It prints a ready curl; paste it in the terminal. Expect `200` and body `OK`. Then `event=on_refund` with the same fields flips the row to `refunded`. Logs: Supabase dashboard -> Edge Functions -> digistore-ipn -> Logs.
