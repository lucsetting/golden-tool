// Digistore24 IPN -> Golden Tool entitlements.
// Contract (Digistore24 IPN guide + official ipn_receiver.php example):
//   https://www.digistore24.com/download/ipn/examples/ipn/digistore_ipn.pdf
//   https://www.digistore24.com/download/ipn/examples/ipn/ipn_receiver.php
// - POST, application/x-www-form-urlencoded. Fields used: event, email, product_id, order_id, api_mode.
// - sha_sign = UPPERCASE hex SHA-512 over, for each key sorted ascending (sha_sign excluded, empty values
//   skipped): `KEY=value` + passphrase, concatenated with no separator. Passphrase is the IPN "SHA512" setting.
// - Response body must be the text "OK".
// ponytail: nested/array params (key[sub]) are signed under their literal key; Digistore24 does not send them for these events.
import { createClient } from 'jsr:@supabase/supabase-js@2'

type Kind = 'all' | 'debts' | 'goals' | 'reports' | 'lifetime'
const KINDS: readonly string[] = ['all', 'debts', 'goals', 'reports', 'lifetime']

const OK = () => new Response('OK', { status: 200, headers: { 'content-type': 'text/plain' } })
const fail = (status: number, msg: string) => new Response(msg, { status, headers: { 'content-type': 'text/plain' } })

const hex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()

async function sign(fields: Record<string, string>, passphrase: string): Promise<string> {
  let s = ''
  for (const k of Object.keys(fields).sort()) {
    if (k === 'sha_sign' || k === 'SHASIGN' || fields[k] === '') continue
    s += `${k}=${fields[k]}${passphrase}`
  }
  return hex(await crypto.subtle.digest('SHA-512', new TextEncoder().encode(s)))
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

async function parseBody(req: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if ((req.headers.get('content-type') ?? '').includes('application/json')) {
    const j: unknown = await req.json()
    if (typeof j !== 'object' || j === null) throw new Error('bad json')
    for (const [k, v] of Object.entries(j)) if (v !== null && v !== undefined && typeof v !== 'object') out[k] = String(v)
  } else {
    for (const [k, v] of await req.formData()) if (typeof v === 'string') out[k] = v
  }
  return out
}

function productMap(): Record<string, Kind> {
  try {
    const m: unknown = JSON.parse(Deno.env.get('DIGISTORE_PRODUCT_MAP') ?? '{}')
    const out: Record<string, Kind> = {}
    if (typeof m === 'object' && m !== null)
      for (const [id, kind] of Object.entries(m)) if (typeof kind === 'string' && KINDS.includes(kind)) out[id.trim()] = kind as Kind
    return out
  } catch {
    return {}
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'Method Not Allowed')

  let f: Record<string, string>
  try { f = await parseBody(req) } catch { return fail(400, 'Bad body') }

  const passphrase = Deno.env.get('DIGISTORE_IPN_PASSPHRASE') ?? ''
  if (passphrase) {
    const expected = await sign(f, passphrase)
    if (!safeEqual(expected, (f.sha_sign ?? '').toUpperCase())) {
      console.log(`ipn rejected: bad signature event=${f.event ?? '?'} order=${f.order_id ?? '?'}`)
      return fail(403, 'Invalid signature')
    }
  } else if (Deno.env.get('ALLOW_UNSIGNED_IPN') !== 'true') {
    console.log('ipn rejected: no passphrase configured')
    return fail(403, 'Signature verification not configured')
  }

  const event = f.event ?? ''
  if (event === 'connection_test') return OK()

  const grant = event === 'on_payment'
  const revoke = event === 'on_refund' || event === 'on_chargeback' || event === 'on_payment_missed'
  if (!grant && !revoke) { console.log(`ipn ignored event=${event}`); return OK() }

  const product = productMap()[(f.product_id ?? '').trim()]
  if (!product) { console.log(`ipn ignored: unknown product_id=${f.product_id ?? ''} event=${event}`); return OK() }

  const email = (f.email ?? '').trim().toLowerCase()
  const order_id = (f.order_id ?? '').trim()
  // order_id is part of the unique key; NULLs would never conflict, so refuse rather than duplicate.
  if (!email || !order_id) { console.log(`ipn bad: missing email/order_id event=${event}`); return fail(400, 'Missing email or order_id') }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const status = grant ? 'active' : 'refunded'
  const { error } = await db.from('entitlements').upsert({ email, product, order_id, status }, { onConflict: 'email,product,order_id' })
  if (error) {
    console.log(`ipn db error event=${event} order=${order_id}: ${error.message}`)
    return fail(500, 'DB error') // non-OK so Digistore24 retries
  }
  console.log(`ipn ${event} -> ${status} product=${product} order=${order_id} mode=${f.api_mode ?? '?'}`)
  return OK()
})
