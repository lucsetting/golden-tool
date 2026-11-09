// Prints a curl for a signed test IPN. Same algorithm as index.ts.
// Usage: node sign-test.mjs <passphrase> <function-url> [key=value ...]
// e.g.   node sign-test.mjs 'my-passphrase' https://abc.supabase.co/functions/v1/digistore-ipn event=on_payment email=a@b.com product_id=12345 order_id=TEST1
import { createHash } from 'node:crypto'

const [passphrase, url, ...pairs] = process.argv.slice(2)
if (!passphrase || !url || !pairs.length) {
  console.error('usage: node sign-test.mjs <passphrase> <url> key=value [key=value ...]')
  process.exit(1)
}
const f = Object.fromEntries(pairs.map((p) => [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)]))
let s = ''
for (const k of Object.keys(f).sort()) if (f[k] !== '') s += `${k}=${f[k]}${passphrase}`
f.sha_sign = createHash('sha512').update(s).digest('hex').toUpperCase()
const data = Object.entries(f).map(([k, v]) => `--data-urlencode '${k}=${v.replaceAll("'", `'\\''`)}'`).join(' \\\n  ')
console.log(`curl -i -X POST '${url}' \\\n  ${data}`)
