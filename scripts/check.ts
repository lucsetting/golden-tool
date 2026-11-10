// Smallest check that fails if money logic or license logic breaks. Run: npx tsx scripts/check.ts
import assert from 'node:assert/strict'
import { generateKey, isValidKey, normalizeKey, parseKey } from '../src/lib/license'
import { budgetState, byCategory, cashFlow, dailyCumulative, dayIn, dueSoon, monthStats, normName, payoffPlan, postings, ruleFor, safeToSave, streak, subscriptions, total, weeklyRecap } from '../src/lib/calc'
import { addDays, currentMonthKey, daysInMonth, shiftMonth, todayISO } from '../src/lib/money'
import { categorise, detectColumns, guessDayFirst, guessPositiveOut, parseCSV, parseDate, parseMoney, rowKey, toRows } from '../src/lib/statement'

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
// ---------- stage 2 ----------
const E = (id: string, amount: number, date: string, x: object = {}) => ({ id, amount, categoryId: 'a', name: id, date, createdAt: 0, ...x })

// cash flow and savings rate
{
  const inc = [{ id: 'i', amount: 4000, source: 'Salary', date: '2026-03-01', createdAt: 0 }]
  assert.deepEqual(cashFlow(inc, [E('x', 3000, '2026-03-10')], '2026-03'), { month: '2026-03', income: 4000, spent: 3000, net: 1000, rate: 25 })
  assert.equal(cashFlow([], [E('x', 50, '2026-03-10')], '2026-03').rate, null, 'no income: the savings rate is a dash, not a number')
  const neg = cashFlow(inc, [E('x', 5000, '2026-03-10')], '2026-03')
  assert.equal(neg.net, -1000); assert.equal(neg.rate, -25, 'spending above income gives a negative rate')
}

// bills: the day in short months, posting once, catch-up, due soon, subscriptions
{
  assert.equal(dayIn(31, '2026-02'), '2026-02-28', 'day 31 falls on the last day of February')
  assert.equal(dayIn(31, '2024-02'), '2024-02-29'); assert.equal(dayIn(0, '2026-04'), '2026-04-01')
  const rent = { id: 'rent', amount: 1500, categoryId: 'a', name: 'Rent', dayOfMonth: 1, active: true }
  const gym = { id: 'gym', amount: 40, categoryId: 'a', name: 'Gym', dayOfMonth: 31, active: true, subscription: true }
  const off = { id: 'off', amount: 9, categoryId: 'a', name: 'Paused', dayOfMonth: 2, active: false, subscription: true }
  const base = { expenses: [], recurring: [rent, gym, off], incomes: [], recurringApplied: ['2026-01'] }
  const first = postings(base, '2026-02-10')
  assert.deepEqual(first.expenses.map(e => [e.name, e.date]), [['Rent', '2026-02-01']], 'only the bills whose day has come, never a paused one')
  const month = postings(base, '2026-02-28')
  assert.deepEqual(month.expenses.map(e => e.date), ['2026-02-01', '2026-02-28'], 'day 31 posts on Feb 28')
  const after = { ...base, expenses: month.expenses.map((e, i) => ({ ...e, id: 'p' + i, createdAt: 0 })), recurringApplied: [...base.recurringApplied, ...month.applied] }
  assert.equal(postings(after, '2026-02-28').applied.length, 0, 'a second run posts nothing')
  assert.equal(postings({ ...after, expenses: [] }, '2026-02-28').expenses.length, 0, 'a posting the customer deleted does not come back')
  const legacy = { ...base, expenses: [E('old', 1500, '2026-02-01', { recurringId: 'rent' })], recurringApplied: ['2026-02'] }
  assert.equal(postings(legacy, '2026-02-10').expenses.length, 0, 'an expense posted by the previous version is not posted twice')
  const away = postings(base, '2026-04-02') // nobody opened the app in February or March
  assert.deepEqual(away.expenses.map(e => e.date), ['2026-02-01', '2026-02-28', '2026-03-01', '2026-03-31', '2026-04-01'], 'missed months are caught up')
  // repeating income: the first one is the entry itself, later months post on the same day
  const pay = { id: 'pay', amount: 4000, source: 'Salary', date: '2026-01-31', repeat: true, createdAt: 0 }
  const inc = postings({ ...base, recurring: [], incomes: [pay] }, '2026-03-15')
  assert.deepEqual(inc.incomes.map(i => [i.date, i.repeatOf]), [['2026-02-28', 'pay']], 'March 31 has not come yet')
  // due soon: the seven days after today, across a month end
  assert.deepEqual(dueSoon([rent, gym, off], '2026-01-28').map(d => [d.bill.id, d.date]), [['gym', '2026-01-31'], ['rent', '2026-02-01']])
  assert.deepEqual(dueSoon([rent], '2026-02-01'), [], 'a bill due today is already an expense')
  assert.equal(dueSoon([rent], '2026-01-25').length, 1); assert.equal(dueSoon([rent], '2026-01-24').length, 0, 'eight days away is not due soon')
  const subs = subscriptions([rent, gym, off])
  assert.deepEqual(subs.items.map(i => [i.bill.id, i.yearly]), [['gym', 480], ['off', 108]]); assert.equal(subs.yearly, 480, 'paused subscriptions are left out of the total')
}

// budget state
assert.equal(budgetState(79, 100), 'ok'); assert.equal(budgetState(80, 100), 'warn'); assert.equal(budgetState(100, 100), 'warn')
assert.equal(budgetState(100.01, 100), 'over'); assert.equal(budgetState(50), 'none'); assert.equal(budgetState(50, 0), 'none')

// category rules
{
  assert.equal(normName("  Trader Joe's #552  "), 'trader joes'); assert.equal(normName('COSTCO-WHSE  0412'), 'costco whse'); assert.equal(normName('123'), '')
  const rules = { 'trader joes': 'groceries', shell: 'transport', 'shell cafe': 'dining' }
  assert.equal(ruleFor(rules, 'TRADER JOES'), 'groceries', 'case does not matter')
  assert.equal(ruleFor(rules, 'POS 4412 TRADER JOE\'S #552 SEATTLE WA'), 'groceries', 'a bank line holds the name')
  assert.equal(ruleFor(rules, 'Shell Cafe 22'), 'dining', 'the longest rule wins'); assert.equal(ruleFor(rules, 'Seashells'), undefined, 'whole words only')
  assert.equal(ruleFor(rules, ''), undefined)
}

// statement import
{
  const csv = 'Date,Description,Amount,Balance\r\n11/03/2026,"SAFEWAY #1234, SEATTLE",-$106.40,"1,893.60"\r\n11/04/2026,"He said ""hi""",(12.50),1881.10\r\n11/05/2026,PAYROLL ACME INC,"$2,000.00",3881.10\r\n\r\nnot a row\r\n'
  const rows = parseCSV(csv)
  assert.equal(rows.length, 5); assert.equal(rows[1][1], 'SAFEWAY #1234, SEATTLE'); assert.equal(rows[2][1], 'He said "hi"')
  const m = detectColumns(rows)
  assert.deepEqual(m, { header: true, date: 0, name: 1, amount: 2, debit: -1, credit: -1 })
  assert.equal(guessPositiveOut(rows, m), false); assert.equal(guessDayFirst(rows, m), false)
  const st = toRows(rows, m)
  assert.deepEqual(st.map(r => [r.date, r.amount]), [['2026-11-03', 106.4], ['2026-11-04', 12.5], ['2026-11-05', -2000]], 'money out is positive, money in negative, a line without a date is dropped')
  // separate debit and credit columns, no header names to go by for the date
  const two = parseCSV('Posted;Details;Debit;Credit\n03.11.2026;Rent;1.450,00;\n25.11.2026;Salary;;4.000,00\n')
  const m2 = detectColumns(two)
  assert.deepEqual([m2.amount, m2.debit, m2.credit], [-1, 2, 3]); assert.equal(guessDayFirst(two, m2), true)
  assert.deepEqual(toRows(two, m2, true).map(r => [r.date, r.amount]), [['2026-11-03', 1450], ['2026-11-25', -4000]])
  // no header at all, and a card statement where every amount is positive
  const bare = parseCSV('2026-11-01,Coffee,4.50\n2026-11-02,Books,30\n')
  const m3 = detectColumns(bare)
  assert.deepEqual(m3, { header: false, date: 0, name: 1, amount: 2, debit: -1, credit: -1 }); assert.equal(guessPositiveOut(bare, m3), true)
  assert.deepEqual(toRows(bare, m3, false, true).map(r => r.amount), [4.5, 30])
  assert.equal(parseMoney('€ 1.234,56'), 1234.56); assert.equal(parseMoney('1,234'), 1234); assert.equal(parseMoney('12.00-'), -12); assert.ok(isNaN(parseMoney('n/a')))
  assert.equal(parseDate('3/11/26'), '2026-03-11'); assert.equal(parseDate('3/11/26', true), '2026-11-03'); assert.equal(parseDate('Nov 5, 2026'), '2026-11-05')
  assert.equal(parseDate('13/40/2026'), null); assert.equal(parseDate('Rent 5'), null)
  // duplicates: same date, amount and normalised name
  assert.equal(rowKey('2026-11-03', -106.4, 'Safeway #1234'), rowKey('2026-11-03', 106.4, 'SAFEWAY 99'))
  assert.notEqual(rowKey('2026-11-03', 106.4, 'Safeway'), rowKey('2026-11-04', 106.4, 'Safeway'))
  // category: the customer's rule, then the built-in words, then Other
  const all = [{ id: 'groceries' }, { id: 'dining' }, { id: 'transport' }, { id: 'pets' }, { id: 'other' }].map(c => ({ ...c, name: c.id, icon: 'Circle', color: '#000' }))
  assert.equal(categorise('SAFEWAY #1234, SEATTLE', {}, all), 'groceries'); assert.equal(categorise('UBER EATS 22', {}, all), 'dining'); assert.equal(categorise('UBER TRIP', {}, all), 'transport')
  assert.equal(categorise('SAFEWAY #1234', { safeway: 'pets' }, all), 'pets', 'a rule beats the built-in words')
  assert.equal(categorise('SAFEWAY', { safeway: 'gone' }, all), 'groceries', 'a rule for a deleted category is ignored'); assert.equal(categorise('XYZ LLC', {}, all), 'other')
  assert.equal(categorise('NETFLIX', {}, all), 'other', 'no built-in category to put it in')
}

// weekly recap and streak
{
  const t = '2026-03-20', cat = [{ id: 'a', name: 'A', icon: 'Circle', color: '#000' }]
  assert.equal(weeklyRecap([E('new', 10, '2026-03-16')], cat, t), null, 'hidden until seven days of data exist')
  const r = weeklyRecap([E('w1', 30, '2026-03-14'), E('w2', 70, '2026-03-20'), E('p1', 80, '2026-03-13'), E('old', 500, '2026-03-06')], cat, t)!
  assert.deepEqual([r.spent, r.prev, r.diff, r.pct, r.count], [100, 80, 20, 25, 2]); assert.equal(r.biggest!.id, 'w2'); assert.equal(r.top!.category.id, 'a')
  assert.equal(weeklyRecap([E('old', 5, '2026-03-01'), E('w', 9, '2026-03-20')], cat, t)!.pct, null, 'nothing the week before: no percentage')

  const today = todayISO(), day = Number(today.slice(8)), cur = currentMonthKey(), pm = shiftMonth(cur, -1), dim = daysInMonth(pm), limit = 100 * dim
  const d = (n: number) => `${pm}-${String(n).padStart(2, '0')}`
  assert.deepEqual(streak([], limit), { days: 0, longest: 0, months: 0 }); assert.equal(streak([E('x', 1, d(10))], 0).days, 0, 'no limit, no streak')
  assert.deepEqual(streak([E('x', 1, d(10))], limit), { days: day + dim - 9, longest: day + dim - 9, months: 1 }, 'days before the first expense do not count')
  assert.equal(streak([E('x', 50, d(1)), E('big', limit, d(dim - 2))], limit).days, day, 'a day over the pace ends the streak')
  assert.equal(streak([E('x', 50, d(1)), E('big', limit, d(dim - 2))], limit).months, 0, 'a month over the limit does not count')
  assert.equal(streak([E('x', 400, d(3))], limit).days, day + dim - 3, 'back under the pace on day 4')
  assert.equal(streak([E('x', 50, d(1)), E('big', limit * 3, d(dim))], limit).longest, dim - 1, 'the longest run is kept after it ends')
  assert.equal(streak([E('x', 1, shiftMonth(pm, -1) + '-15'), E('y', 1, d(2))], limit).months, 2)
  assert.equal(streak([E('rent', 1500, d(1), { recurringId: 'r' }), E('x', 1, shiftMonth(pm, -1) + '-01')], limit).days >= day + dim, true, 'a bill on its day is on the pace')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
}

// state: a version 2 document gains the new lists and loses nothing; fields from a newer version survive the trip
{
  const { migrate, pickData, useStore, loadState } = await import('../src/store')
  const { forServer } = await import('../src/lib/sync')
  const v2 = {
    settings: { currency: 'EUR', monthlyLimit: 2500, onboarded: true, theme: 'dark', monthStartDay: 1, keys: ['GOLDABCD1234'], firstOpenedAt: 1700000000000 },
    categories: [{ id: 'groceries', name: 'Food', icon: 'ShoppingCart', color: '#3DBE7A', budget: 400 }, { id: 'x9', name: 'Pets', icon: 'PawPrint', color: '#000' }],
    expenses: [E('1', 10, '2026-01-05', { note: 'n', recurringId: 'r' })],
    recurring: [{ id: 'r', amount: 10, categoryId: 'x9', name: 'Vet plan', dayOfMonth: 5, active: true }],
    goals: [{ id: 'g', name: 'Trip', target: 100, saved: 40, color: '#000' }], debts: [{ id: 'd', name: 'Card', balance: 900, apr: 20, minPayment: 30 }],
    recurringApplied: ['2026-01'],
  }
  const up = migrate(structuredClone(v2))
  for (const k of Object.keys(v2) as (keyof typeof v2)[]) assert.deepEqual(up[k], v2[k], `${k} must come through the upgrade unchanged`)
  assert.deepEqual(up.incomes, []); assert.deepEqual(up.rules, {}); assert.deepEqual(migrate(up), up, 'running the migration twice changes nothing')
  assert.equal(migrate({}).categories.length, 12); assert.deepEqual(migrate(null).expenses, [])
  const newer = { ...v2, netWorth: [{ month: '2026-01', assets: 5 }] } // written by a later version of the app
  assert.deepEqual((migrate(newer) as unknown as typeof newer).netWorth, newer.netWorth, 'a field this version does not know is kept')
  const sent = forServer(newer, { ...pickData(migrate(newer)), expenses: [] })
  assert.deepEqual(sent.netWorth, newer.netWorth, 'and it is sent back to the account untouched'); assert.deepEqual(sent.expenses, [])
  // backup: what is exported comes back the same
  loadState({ ...up, incomes: [{ id: 'i', amount: 5, source: 'Gift', date: '2026-01-02', createdAt: 0 }], rules: { vet: 'x9' }, expenses: [E('1', 10, '2026-01-05', { tags: ['trip'], importId: 'imp' })] })
  const before = pickData(useStore.getState()), json = useStore.getState().exportJSON()
  useStore.getState().resetAll()
  assert.deepEqual(useStore.getState().expenses, []); assert.deepEqual(useStore.getState().settings.keys, ['GOLDABCD1234'], 'erasing keeps the codes')
  assert.equal(useStore.getState().settings.firstOpenedAt, 1700000000000, 'and the day included access started')
  // included access ended in 2024: the one guard refuses every data write, lets settings through, and still loads the account's copy
  assert.equal(useStore.getState().importJSON(json), true); assert.deepEqual(useStore.getState().expenses, [], 'restore is a data write: refused')
  useStore.getState().addExpense({ amount: 1, categoryId: 'other', name: 'x', date: '2026-01-01' }); useStore.getState().addIncome({ amount: 1, source: 's', date: '2026-01-01' })
  useStore.getState().updateCategory('groceries', { budget: 1 }); useStore.getState().learnRule('x', 'other'); useStore.setState({ goals: [] as never[], debts: [{} as never] })
  assert.deepEqual([useStore.getState().expenses.length, useStore.getState().incomes.length, useStore.getState().debts.length, Object.keys(useStore.getState().rules).length], [0, 0, 0, 0])
  useStore.getState().updateSettings({ theme: 'light' }); assert.equal(useStore.getState().settings.theme, 'light')
  loadState(JSON.parse(json)); assert.deepEqual(pickData(useStore.getState()), before, 'export then load gives back every record')
  const { useUI } = await import('../src/ui-state')
  useUI.getState().dismissToast()
  loadState({ settings: { ...useStore.getState().settings, firstOpenedAt: Date.now() } })
}
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
