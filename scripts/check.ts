// Smallest check that fails if money logic or license logic breaks. Run: npx tsx scripts/check.ts
import assert from 'node:assert/strict'
import { generateKey, isValidKey, normalizeKey, parseKey } from '../src/lib/license'
import { byCategory, dailyCumulative, monthStats, payoffPlan, safeToSave, total } from '../src/lib/calc'
import { currentMonthKey, daysInMonth, todayISO } from '../src/lib/money'

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
// projection: bills count once, only the rest is spread over the days (rent on day 1 is not a daily habit)
{
  const mk = currentMonthKey(), day = Number(todayISO().slice(8, 10)), dim = daysInMonth(mk)
  const rent = { id: 'r', amount: 1500, categoryId: 'a', name: 'Rent', date: `${mk}-01`, createdAt: 0, recurringId: 'rent' }
  const food = { id: 'f', amount: 10 * day, categoryId: 'a', name: 'Food', date: `${mk}-01`, createdAt: 0 } // $10 a day so far
  const phone = { id: 'phone', amount: 300, categoryId: 'a', name: 'Phone', dayOfMonth: dim, active: true } // not posted yet
  const off = { ...phone, id: 'off', active: false }
  const st = monthStats([rent, food], mk, 3000, [{ ...phone, id: 'rent' }, phone, off])
  assert.equal(st.projected, 1500 + 300 + 10 * dim, 'projection = bills once + daily average of the rest')
  assert.equal(st.expectedByNow, 1500 + (1200 * day) / dim, 'posted bills are expected in full, the rest pro rata')
  assert.notEqual(st.pace, 'behind', 'rent already paid must not read as behind')
  assert.equal(safeToSave(st), 3000 - st.projected)
  assert.equal(monthStats([rent, food], mk, 3000).projected, 1500 + 10 * dim, 'callers without the recurring list still split posted bills')
  const curve = dailyCumulative([rent, food], mk, 3000, [phone])
  assert.equal(curve[0].ideal, 1500 + Math.round(1200 / dim)); assert.equal(curve[dim - 1].ideal, 3000)
  assert.equal(curve[day - 1].ideal, Math.min(3000, Math.round(st.expectedByNow + (day === dim ? 300 : 0))))
  assert.equal(monthStats([{ ...rent, date: '2026-01-01' }], '2026-01', 3000, [phone]).projected, 1500, 'a past month projects to what was spent')
}

// debt payoff: $1000 @ 0% with $100/mo min = 10 months, no interest
const p = payoffPlan([{ id: 'd', name: 'd', balance: 1000, apr: 0, minPayment: 100 }], 0, 'snowball')
assert.equal(p.months, 10); assert.equal(p.interestPaid, 0)
const p2 = payoffPlan([{ id: 'd', name: 'd', balance: 1000, apr: 24, minPayment: 50 }], 100, 'avalanche')
assert.ok(p2.months < 10 && p2.interestPaid > 0)
// delete with undo restores the item at the same position
{
  const { useStore } = await import('../src/store')
  const { useUI } = await import('../src/ui-state')
  const { deleteWithUndo } = await import('../src/lib/undo')
  const mk = (id: string) => ({ id, amount: 1, categoryId: 'other', name: id, date: '2026-01-01', createdAt: 0 })
  useStore.setState({ expenses: [mk('a'), mk('b'), mk('c')] })
  deleteWithUndo('expenses', 'b')
  assert.deepEqual(useStore.getState().expenses.map(e => e.id), ['a', 'c'])
  useUI.getState().toast!.action!.run()
  assert.deepEqual(useStore.getState().expenses.map(e => e.id), ['a', 'b', 'c'])
  useUI.getState().dismissToast()
}

console.log('check OK')
