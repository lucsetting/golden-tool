// Usage: node scripts/gen-keys.mjs <kind> <count>
//   kind: all | debts | goals | reports | lifetime   (GOLD / DEBT / GOAL / RPRT / LIFE)
// Prints activation codes for the Digistore24 thank-you page of that product.
// Mirrors src/lib/license.ts exactly. Change SECRET in both files together.
const SECRET = process.env.LICENSE_SECRET ?? 'golden-tool-2026' // must equal VITE_LICENSE_SECRET used in the build
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PREFIX = { all: 'GOLD', debts: 'DEBT', goals: 'GOAL', reports: 'RPRT', lifetime: 'LIFE' }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 } return h }
function checksum(s) { let h = hash(s.toUpperCase() + SECRET); let out = ''; for (let i = 0; i < 4; i++) { out += ALPHA[h % ALPHA.length]; h = Math.floor(h / ALPHA.length) } return out }
const kind = process.argv[2] ?? 'all'
const prefix = PREFIX[kind]
if (!prefix) { console.error('kind must be one of: ' + Object.keys(PREFIX).join(', ')); process.exit(1) }
const n = Number(process.argv[3] ?? 10)
const seen = new Set()
while (seen.size < n) { let p = ''; for (let i = 0; i < 4; i++) p += ALPHA[Math.floor(Math.random() * ALPHA.length)]; seen.add(`${prefix}-${p}-${checksum(prefix + p)}`) }
console.log([...seen].join('\n'))
