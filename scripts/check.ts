// Smallest check that fails if money logic or license logic breaks. Run: npx tsx scripts/check.ts
import assert from 'node:assert/strict'
import { generateKey, isValidKey, normalizeKey, parseKey } from '../src/lib/license'
import { byCategory, monthStats, payoffPlan, total } from '../src/lib/calc'

// license
for (const kind of ['all', 'debts', 'goals', 'reports', 'lifetime'] as const) {
  const k = generateKey(kind)
  assert.equal(parseKey(k), kind, `generated ${kind} key must parse`)
  assert.equal(parseKey(k.toLowerCase().replace(/-/g, ' ')), kind, 'lowercase/unformatted key must parse')
}
assert.equal(parseKey('GOLD-AAAA-AAAA'), null, 'wrong checksum must fail')
assert.equal(parseKey('XXXX-AAAA-AAAA'), null, 'unknown prefix must fail')
assert.ok(!isValidKey('DEBT-XBAJ-864X'), 'one wrong char must fail')
assert.equal(normalizeKey('gold-ab cd-12.34'), 'GOLDABCD1234')

// calc
const cats = [{ id: 'a', name: 'A', icon: 'Circle', color: '#000' }, { id: 'b', name: 'B', icon: 'Circle', color: '#000' }]
const ex = [
  { id: '1', amount: 10.1, categoryId: 'a', name: 'x', date: '2026-01-05', createdAt: 1 },
  { id: '2', amount: 20.2, categoryId: 'b', name: 'y', date: '2026-01-06', createdAt: 2 },
  { id: '3', amount: 0.3, categoryId: 'b', name: 'z', date: '2026-01-07', createdAt: 3 },
]
assert.equal(total(ex), 30.6)
const bc = byCategory(ex, cats)
assert.equal(bc[0].category.id, 'b'); assert.equal(bc[0].amount, 20.5); assert.equal(bc[0].count, 2)
const past = monthStats(ex, '2026-01', 100) // past month
assert.equal(past.daysLeft, 0); assert.equal(past.remaining, 69.4); assert.equal(past.pace, 'ahead')
assert.equal(monthStats([{ ...ex[0], amount: 150 }], '2026-01', 100).pace, 'over')

// debt payoff: $1000 @ 0% with $100/mo min = 10 months, no interest
const p = payoffPlan([{ id: 'd', name: 'd', balance: 1000, apr: 0, minPayment: 100 }], 0, 'snowball')
assert.equal(p.months, 10); assert.equal(p.interestPaid, 0)
const p2 = payoffPlan([{ id: 'd', name: 'd', balance: 1000, apr: 24, minPayment: 50 }], 100, 'avalanche')
assert.ok(p2.months < 10 && p2.interestPaid > 0)
console.log('check OK')
