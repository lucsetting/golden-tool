// Smallest check that fails if money logic or license logic breaks. Run: npx tsx scripts/check.ts
import assert from 'node:assert/strict'
import { generateKey, isValidKey, normalizeKey, parseKey } from '../src/lib/license'
import { budgetState, byCategory, cashFlow, dailyCumulative, dayIn, dueSoon, monthStats, normName, postings, ruleFor, safeToSave, streak, subscriptions, total, weeklyRecap } from '../src/lib/calc'
import { addDays, currentMonthKey, daysInMonth, parseAmount, parseMoney, plural, shiftMonth, todayISO } from '../src/lib/money'
import { balanceEdit, debtsNow, minimumOnly, neverPaid, owed, planFromNow, planProgress, simulate } from '../src/lib/debts'
import { autoPlan, goalStatus, isRunning, milestones, monthlyNeed, noSpendWeek, paceSeries, setAside, week52, withSaved } from '../src/lib/goals'
import { anomalies, averageIncome, budgetReport, carriedInto, categoryTrends, dayHeat, fiftyThirtyTwenty, forecastYear, netWorth, netWorthLine, rollover, usualSpend, yearCompare } from '../src/lib/vision'
import { categorise, detectColumns, guessDayFirst, guessPositiveOut, parseCSV, parseDate, rowKey, toRows } from '../src/lib/statement'

// license
for (const kind of ['all', 'debts', 'goals', 'reports'] as const) {
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
const p = simulate([{ id: 'd', name: 'd', balance: 1000, apr: 0, minPayment: 100 }], { extra: 0, method: 'snowball' })
assert.equal(p.months, 10); assert.equal(p.interestPaid, 0)
const p2 = simulate([{ id: 'd', name: 'd', balance: 1000, apr: 24, minPayment: 50 }], { extra: 100, method: 'avalanche' })
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
  const base = { expenses: [], recurring: [rent, gym, off], incomes: [], recurringApplied: ['2026-01', 'rent@2026-01'] } // last opened in January, before Gym's day
  const first = postings(base, '2026-02-10')
  assert.deepEqual(first.expenses.map(e => [e.name, e.date]), [['Gym', '2026-01-31'], ['Rent', '2026-02-01']], 'only the bills whose day has come, never a paused one')
  const month = postings(base, '2026-02-28')
  assert.deepEqual(month.expenses.map(e => e.date), ['2026-01-31', '2026-02-01', '2026-02-28'], 'day 31 posts on Feb 28')
  const after = { ...base, expenses: month.expenses.map((e, i) => ({ ...e, id: 'p' + i, createdAt: 0 })), recurringApplied: [...base.recurringApplied, ...month.applied] }
  assert.equal(postings(after, '2026-02-28').applied.length, 0, 'a second run posts nothing')
  assert.equal(postings({ ...after, expenses: [] }, '2026-02-28').expenses.length, 0, 'a posting the customer deleted does not come back')
  const legacy = { ...base, expenses: [E('old', 1500, '2026-02-01', { recurringId: 'rent' })], recurringApplied: ['2026-02'] }
  assert.equal(postings(legacy, '2026-02-10').expenses.length, 0, 'an expense posted by the previous version is not posted twice')
  const away = postings(base, '2026-04-02') // last opened in January, before Gym's day
  assert.deepEqual(away.expenses.map(e => e.date), ['2026-01-31', '2026-02-01', '2026-02-28', '2026-03-01', '2026-03-31', '2026-04-01'], 'missed months are caught up')
  const early = { ...base, recurring: [gym], recurringApplied: ['2026-01', '2026-02'] } // opened on Feb 10, then not again until March
  assert.deepEqual(postings(early, '2026-03-03').expenses.map(e => e.date), ['2026-02-28'], 'a bill that came due after the last visit of a month still posts')
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
  const card = parseCSV('2026-11-01,Coffee,4.50\n2026-11-02,Books,30\n2026-11-03,Shoes,80\n2026-11-04,PAYMENT THANK YOU,-500\n')
  assert.equal(guessPositiveOut(card, detectColumns(card)), true, 'one payment does not turn a card statement around')
  assert.equal(detectColumns(parseCSV('Date,Value Date,Description,Amount\n11/04/2026,11/04/2026,Coffee,-4.50\n')).amount, 3, 'a second date column is not the amount')
  assert.equal(detectColumns(parseCSV('Date,Posted,Description,Paid\n11/04/2026,11/05/2026,Coffee,-4.50\n')).amount, 3)
  assert.deepEqual(toRows(bare, m3, false, true).map(r => r.amount), [4.5, 30])
  assert.equal(parseMoney('€ 1.234,56'), 1234.56); assert.equal(parseMoney('1,234'), 1234); assert.equal(parseMoney('12.00-'), -12); assert.ok(isNaN(parseMoney('n/a')))
  assert.equal(parseAmount('12,50'), 12.5); assert.equal(parseAmount('12.505'), 12.51); assert.ok(!(parseAmount('') > 0)); assert.equal(plural(1, 'bill'), '1 bill'); assert.equal(plural(2, 'entry', 'entries'), '2 entries')
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
  assert.equal(categorise('NETFLIX', {}, all), 'other', 'no built-in category to put it in'); assert.equal(normName('NETFLIX.COM'), 'netflix com')
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

// ---------- stage 3 ----------

// payoff plan: the minimum of a paid debt keeps going to the next one, so the monthly amount never drops
{
  const D = (id: string, balance: number, apr: number, minPayment: number, x: object = {}) => ({ id, name: id, balance, apr, minPayment, ...x })
  const two = simulate([D('small', 100, 0, 50), D('big', 1000, 0, 50)], { extra: 0, method: 'snowball' })
  assert.equal(two.months, 11); assert.deepEqual(two.rows.map(r => r.total), Array(11).fill(100))
  assert.equal(two.payoffMonth.get('small'), 2); assert.deepEqual(two.rows[1].paidOff, ['small']); assert.equal(two.rows[10].balance, 0)
  // what-if against the base plan: an extra amount, a one-off payment now, a one-off payment in a later month
  const card = [D('card', 5000, 24, 150)], base = simulate(card, { extra: 0, method: 'avalanche' }, '2026-01')
  const more = simulate(card, { extra: 100, method: 'avalanche' }, '2026-01')
  assert.ok(more.months < base.months && more.interestPaid < base.interestPaid, 'an extra amount ends sooner and costs less interest')
  const now = simulate(card, { extra: 0, method: 'avalanche', oneOff: { amount: 1000, month: '2026-01' } }, '2026-01')
  assert.deepEqual([now.months, now.interestPaid], (s => [s.months, s.interestPaid])(simulate([D('card', 4000, 24, 150)], { extra: 0, method: 'avalanche' }, '2026-01')), 'a one-off payment now is a smaller balance')
  const later = simulate(card, { extra: 0, method: 'avalanche', oneOff: { amount: 1000, month: '2026-03' } }, '2026-01')
  assert.equal(later.rows[1].total, 1150); assert.equal(later.rows[0].total, 150); assert.ok(later.interestPaid < base.interestPaid && later.interestPaid > now.interestPaid)
  // strategies side by side: avalanche never pays more interest
  const mix = [D('small', 500, 5, 25), D('big', 4000, 25, 100)]
  const snow = simulate(mix, { extra: 100, method: 'snowball' }), ava = simulate(mix, { extra: 100, method: 'avalanche' })
  assert.equal(snow.payoffMonth.get('small')! < ava.payoffMonth.get('small')!, true); assert.ok(ava.interestPaid < snow.interestPaid)
  assert.equal(Math.round((snow.interestBy.get('small')! + snow.interestBy.get('big')!) * 100) / 100, snow.interestPaid)
  // minimum only: finite when it covers the interest, never when it does not
  assert.equal(minimumOnly(D('x', 5000, 24, 100)).never, true); assert.equal(neverPaid(simulate([D('x', 5000, 24, 100)], { extra: 0, method: 'snowball' })), true)
  const min = minimumOnly(D('x', 5000, 24, 150)); assert.equal(min.never, false); assert.ok(min.months > more.months && min.interest > more.interestPaid)
  // payments: the balance follows them, with a month of interest at each month start; a correction moves it either way
  const debt = { ...D('card', 1000, 12, 100), startDate: '2026-01-10' }
  const P = (amount: number, date: string, x: object = {}) => ({ id: date, debtId: 'card', amount, date, ...x })
  assert.equal(owed(debt, [], '2026-01-31'), 1000); assert.equal(owed(debt, [P(100, '2026-01-20')], '2026-01-19'), 1000, 'a payment dated later has not happened yet')
  assert.equal(owed(debt, [P(100, '2026-01-20'), P(100, '2026-02-15')], '2026-03-05'), 817.09)
  assert.equal(owed(debt, [P(-50, '2026-01-20', { correction: true })], '2026-01-25'), 1050); assert.equal(owed(debt, [P(5000, '2026-01-20')], '2026-03-05'), 0)
  assert.equal(debtsNow([debt], [P(100, '2026-01-20')], '2026-01-25')[0].balance, 900)
  // ahead or behind: the real balance against the plan's balance for this month, counted from the debt's start
  const plan = { extra: 0, method: 'avalanche' as const }, at = (ps: ReturnType<typeof P>[]) => planProgress([debt], ps, plan, '2026-03-05')!
  assert.deepEqual([at([]).since, at([]).expected, at([]).real], ['2026-01', 819.1, 1020.1])
  assert.deepEqual([at([]).state, at([]).by], ['behind', 101], 'nothing paid in February: behind by that payment and its interest')
  assert.deepEqual([at([P(100, '2026-02-15')]).state, at([P(100, '2026-02-15')]).by], ['due', 100], 'on plan through February, March still to pay')
  assert.equal(at([P(100, '2026-02-15'), P(100, '2026-03-02')]).state, 'on')
  assert.deepEqual([at([P(100, '2026-01-20'), P(100, '2026-02-15'), P(100, '2026-03-02')]).state, at([P(100, '2026-01-20'), P(100, '2026-02-15'), P(100, '2026-03-02')]).by], ['ahead', 102.01])
  assert.equal(planProgress([debt], [], plan, '2026-01-25')!.state, 'on', 'the month a debt is entered it is on plan'); assert.equal(planProgress([], [], plan), null)
  const second = { ...D('loan', 2000, 0, 50), startDate: '2026-03-01' } // a debt entered later joins the plan the month after
  assert.equal(planProgress([debt, second], [], plan, '2026-03-05')!.expected, 2819.1)
  // a plan that was changed is counted from that day: a customer who was on plan is not behind for raising the extra amount
  const paid = [P(100, '2026-02-15'), P(100, '2026-03-02')], raised = { ...plan, extra: 200, start: '2026-03-05' }
  assert.deepEqual((r => [r.since, r.expected, r.state])(planProgress([debt], paid, raised, '2026-03-05')!), ['2026-03', 819.1, 'on'])
  assert.deepEqual((r => [r.expected, r.state, r.by])(planProgress([debt], paid, raised, '2026-04-10')!), [527.29, 'due', 300], 'and next month it owes the new payment')
  assert.equal(planProgress([debt], [...paid, P(50, '2026-03-05')], raised, '2026-03-20')!.state, 'ahead', 'a payment on the day of the change counts for the plan')
  // a one-off payment for this month is still to pay, not behind; once paid it is not taken off a second time
  const once = { ...plan, oneOff: { amount: 500, month: '2026-01' }, start: '2026-01-10' }
  assert.deepEqual((r => [r.expected, r.state, r.by])(planProgress([debt], [], once, '2026-01-20')!), [500, 'due', 500])
  assert.equal(planProgress([debt], [P(500, '2026-01-15')], once, '2026-01-20')!.state, 'on')
  assert.deepEqual(planFromNow(once, [P(200, '2026-01-15')], '2026-01-20').oneOff, { amount: 300, month: '2026-01' }); assert.equal(planFromNow(once, [P(500, '2026-01-15')], '2026-01-20').oneOff, undefined)
  assert.equal(planFromNow(once, [P(500, '2026-01-05'), P(-500, '2026-01-15', { correction: true })], '2026-01-20').oneOff!.amount, 500, 'what was paid before the plan was set, and a correction, do not count')
  assert.equal(planFromNow(once, [], '2026-02-01').oneOff, undefined, 'a one-off whose month passed is gone'); assert.equal(planFromNow({ ...once, oneOff: { amount: 500, month: '2026-03' } }, [], '2026-01-20').oneOff!.amount, 500)
  assert.equal(simulate([D('x', 1000, 0, 100)], planFromNow(once, [P(500, '2026-01-15')], '2026-01-20'), '2026-01').months, 10, 'so the plan from today is not shortened twice')
  assert.equal(simulate([D('gone', 0, 0, 50), D('y', 1000, 0, 50)], plan).months, 10, 'the minimum of a debt already paid counts in every screen')
  // typing a new balance: the starting balance while the debt is new, a correction once it has history
  assert.deepEqual(balanceEdit(debt, [], 950, '2026-01-25'), { balance: 950 }); assert.equal(balanceEdit(debt, [], 1000, '2026-01-25'), null)
  assert.deepEqual(balanceEdit(debt, [P(100, '2026-01-20')], 950, '2026-01-25'), { correction: -50 }); assert.deepEqual(balanceEdit(debt, [], 1000, '2026-02-25'), { correction: 10 }, 'a month of interest later the same number is a correction')
}

// goals: saved is the sum of contributions; pace, needed per month, milestones, automatic plan, challenges
{
  const today = '2026-06-15'
  const C = (goalId: string, amount: number, date: string, x: object = {}) => ({ id: goalId + date, goalId, amount, date, ...x })
  const trip = { id: 't', name: 'Trip', target: 1000, color: '#000', deadline: '2027-06-15' }
  const cs = [C('t', 250, '2026-01-10', { source: 'opening' as const }), C('t', 100, '2026-04-20'), C('t', 200, '2026-06-01'), C('other', 9, '2026-06-01')]
  const [now] = withSaved([trip], cs)
  assert.equal(now.saved, 550); assert.equal(monthlyNeed(now, today), 450 / 12); assert.equal(monthlyNeed({ ...now, deadline: undefined }, today), 0); assert.equal(monthlyNeed({ ...now, deadline: '2026-06-01' }, today), 0)
  const ms = milestones(trip, cs, today)
  assert.deepEqual(ms.map(m => m.reached ?? m.expected), ['2026-01-10', '2026-06-01', '2026-08', '2026-11'], '25% and 50% reached on the day; 75% and 100% at 100 a month, the opening amount is not pace')
  assert.equal(milestones(trip, [cs[0]], today)[3].expected, undefined, 'no pace, no expected date')
  const series = paceSeries(trip, cs, today)
  assert.deepEqual(series.map(p => p.saved), [250, 350, 550, 550, null]); assert.deepEqual([series[0].pace, series[4].pace], [250, 1000], 'the line runs from the first contribution to the target on the deadline')
  // automatic plan
  const G = (id: string, target: number, saved: number, deadline?: string) => ({ id, name: id, target, saved, color: '#000', deadline })
  const goals = [G('a', 1200, 0, '2027-06-15'), G('b', 600, 0, '2027-06-15'), G('c', 5000, 0)] // a needs 100 a month, b 50, c has no deadline
  const split = (n: number, gs = goals) => autoPlan(gs, n, today).map(p => p.amount)
  assert.deepEqual(split(120), [100, 20, 0]); assert.deepEqual(split(200), [150, 50, 0], 'the remainder goes to the first goal'); assert.deepEqual(split(0), [0, 0, 0]); assert.deepEqual(split(-5), [0, 0, 0])
  assert.deepEqual(split(400, [G('a', 110, 0, '2027-06-15'), G('c', 5000, 0)]), [110, 290], 'never past the target; a goal with no deadline takes what is left')
  // 52-week challenge and no-spend week
  const w = week52({ id: 'w', kind: '52week', start: '2026-06-01', base: 5, done: [1], goalId: 't' }, today)
  assert.deepEqual([w.week, w.next, w.amount, w.saved, w.total, w.nextStarts], [3, 2, 10, 5, 6890, '2026-06-22'])
  assert.equal(week52({ id: 'w', kind: '52week', start: '2026-06-01', base: 5, done: [1, 2, 3] }, today).next, undefined)
  const ns = { id: 'n', kind: 'nospend' as const, start: '2026-06-13', essentials: ['a'], done: [] }
  const week = noSpendWeek(ns, [E('food', 30, '2026-06-13'), E('rent', 900, '2026-06-14', { categoryId: 'b', recurringId: 'r' })], today)
  assert.deepEqual([week.state, week.clean, week.days[3].state], ['running', 3, 'ahead'], 'an essential expense and a bill do not break the week')
  assert.equal(noSpendWeek(ns, [E('bar', 30, '2026-06-14', { categoryId: 'b' })], today).state, 'broken'); assert.equal(noSpendWeek(ns, [], '2026-06-20').state, 'kept')
  assert.deepEqual([isRunning(ns, today), isRunning(ns, '2026-06-19'), isRunning(ns, '2026-06-20'), isRunning({ ...ns, ended: today }, today)], [true, true, false, false], 'a week stays in view until its last day, broken or not')
  assert.deepEqual([isRunning({ id: 'w', kind: '52week', start: '2026-06-01', base: 5, done: [1] }, today), isRunning({ id: 'w', kind: '52week', start: '2025-01-01', base: 5, done: Array.from({ length: 52 }, (_, i) => i + 1) }, today)], [true, false])
  assert.equal(setAside([...cs, C('t', 40, '2026-06-10', { source: 'plan' as const }), C('t', 999, '2026-06-02', { source: 'opening' as const })], [trip], today), 240, 'this month, without the opening amount and without goals that are gone')
  assert.deepEqual([goalStatus(now, today), goalStatus({ ...now, saved: 1000 }, today), goalStatus({ ...now, deadline: undefined }, today), goalStatus({ ...now, deadline: today }, today)], [null, 'Goal reached', 'No deadline', 'Deadline passed'])
}

// Golden Vision: forecast, anomaly, year over year, heatmap, net worth, rollover, 50/30/20, budget report
{
  const ex = [E('jul', 300, '2026-07-10'), E('aug', 300, '2026-08-10'), E('sep', 600, '2026-09-10'), E('oct', 100, '2026-10-03')]
  const fc = forecastYear(ex, '2026-10-15')
  assert.deepEqual([fc.soFar, fc.usual, fc.forecast, fc.left], [1300, 400, 2400, 2], 'so far, then 400 for October and each month left')
  assert.equal(forecastYear([...ex, E('big', 600, '2026-10-04')], '2026-10-15').forecast, 1200 + 700 + 800, 'a month already above the average counts as it is')
  assert.equal(forecastYear([E('only', 150, '2026-10-03')], '2026-10-15').usual, 310, 'with no complete month the daily average stands in')
  const usual = (id: string, amount: number, x: object = {}) => ['07', '08', '09'].map(m => E(id + m, amount, `2026-${m}-05`, { categoryId: id, ...x }))
  const hist = [...usual('a', 200), ...usual('b', 100), ...usual('c', 20), ...usual('rent', 1500, { recurringId: 'r' })]
  const high = anomalies([...hist, E('a1', 150, '2026-10-10'), E('b1', 60, '2026-10-10', { categoryId: 'b' }), E('c1', 20, '2026-10-10', { categoryId: 'c' }), E('rent10', 1500, '2026-10-01', { categoryId: 'rent', recurringId: 'r' })], cats, '2026-10-15')
  assert.deepEqual(high.map(h => [h.category.id, h.soFar, h.pace, h.usual, h.months]), [['a', 150, 310, 200, 3]], '+55% and 110 above; b is +24%, c is 21 above, the rent is a bill')
  assert.deepEqual(anomalies([...hist, E('a1', 60, '2026-10-02')], cats, '2026-10-02'), [], 'one early expense is not multiplied by the whole month')
  assert.deepEqual(anomalies([E('a1', 900, '2026-10-02')], cats, '2026-10-02'), [], 'no earlier month, nothing to compare with')
  assert.deepEqual(anomalies([E('s', 200, '2026-09-05'), E('a1', 400, '2026-10-10')], cats, '2026-10-15').map(h => [h.usual, h.months]), [[200, 1]], 'a customer one month old is compared with that month')
  const tr = categoryTrends([...hist, E('a6', 50, '2026-06-05')], cats, '2026-10').find(t => t.category.id === 'a')!
  assert.deepEqual([tr.months.length, tr.last, tr.avg3, tr.change, tr.average], [12, 200, 150, 33, 130], 'September against June to August; the average is over the five months since the first expense')
  const yc = yearCompare([E('a', 100, '2025-01-05'), E('b', 80, '2025-02-05'), E('c', 500, '2025-12-05'), E('d', 150, '2026-01-05')], '2026', '2026-02-10')
  assert.deepEqual(yc.rows.slice(0, 3).map(r => [r.now, r.prev, r.diff]), [[150, 100, 50], [0, 80, null], [null, 0, null]]); assert.deepEqual([yc.now, yc.prev, yc.diff, yc.months], [150, 100, 50, 1], 'totals cover the months both years have')
  assert.deepEqual((r => [r.now, r.prev, r.diff])(yearCompare([E('b', 80, '2025-02-05'), E('e', 30, '2026-02-05')], '2026', '2026-02-10').rows[1]), [30, 80, null], 'a month in progress is not set against a whole one')
  const heat = dayHeat([E('a', 10, '2026-03-01'), E('b', 20, '2026-03-02'), E('c', 30, '2026-03-03'), E('d', 40, '2026-03-04'), E('old', 99, '2025-03-04')], '2026')
  assert.deepEqual(['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'].map(heat.level), [1, 2, 3, 4, 0]); assert.equal(heat.days.size, 4)
  assert.deepEqual(netWorth([{ id: 'a', name: 'Car', kind: 'Vehicle', value: 10000 }], [{ id: 'l', name: 'Family', kind: 'Other', value: 2000 }], [{ balance: 500 }]), { assets: 10000, liabilities: 2500, net: 7500 })
  assert.deepEqual([rollover(100, 60), rollover(100, 150), rollover(100, 0)], [40, 0, 100], 'unused budget, never below zero, never more than one month of it')
  assert.deepEqual([carriedInto({ budget: 100, rollover: '2026-09' }, '2026-10', 60), carriedInto({ budget: 100, rollover: '2026-10' }, '2026-10', 60), carriedInto({ budget: 100 }, '2026-10', 60)], [40, 0, 0], 'nothing is carried into the month rollover was switched on')
  assert.deepEqual([...usualSpend([E('x', 300, '2026-07-05'), E('y', 30, '2026-09-05'), E('now', 99, '2026-10-05'), E('old', 99, '2026-06-05')], '2026-10-15')], [['a', 110]])
  assert.deepEqual(netWorthLine([{ month: '2026-10', assets: 1, liabilities: 1 }, { month: '2026-08', assets: 500, liabilities: 100 }], { assets: 900, liabilities: 200 }, '2026-10'), [{ month: '2026-08', net: 400 }, { month: '2026-10', net: 700 }], 'this month is drawn from the values as they are now')
  const preset = fiftyThirtyTwenty(4001, [{ id: 'housing' }, { id: 'groceries' }, { id: 'dining' }, { id: 'shopping' }, { id: 'pets', group: 'needs' }], new Map([['housing', 1500], ['groceries', 500]]))
  assert.deepEqual([preset.needs, preset.wants, preset.savings], [2001, 1200, 800])
  assert.deepEqual([...preset.budgets], [['housing', 1501], ['groceries', 500], ['pets', 0], ['dining', 600], ['shopping', 600]], 'needs by what they usually cost, wants in equal shares, every unit handed out')
  assert.equal(averageIncome([{ id: 'i', amount: 3000, source: 's', date: '2026-09-01', createdAt: 0 }, { id: 'j', amount: 5000, source: 's', date: '2026-08-01', createdAt: 0 }], '2026-10-15'), 4000)
  const rep = budgetReport([E('x', 120, '2026-09-05'), E('y', 80, '2026-10-05')], [{ ...cats[0], budget: 100 }, cats[1]], '2026-10', 3)
  assert.deepEqual([rep.months, rep.tracked, rep.rows.length, rep.rows[0].actual, rep.rows[0].within, rep.rows[0].average], [['2026-08', '2026-09', '2026-10'], 2, 1, [0, 120, 80], 1, 100], 'August is before the first expense: it is not a month within budget')
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
    incomes: [{ id: 'i', amount: 5, source: 'Gift', date: '2026-01-02', createdAt: 0, repeat: true }], rules: { vet: 'x9' }, // what version 3 added
  }
  v2.expenses[0] = E('1', 10, '2026-01-05', { note: 'n', recurringId: 'r', tags: ['trip'], importId: 'imp' })
  const up = migrate(structuredClone(v2))
  for (const k of Object.keys(v2) as (keyof typeof v2)[]) if (k !== 'goals' && k !== 'debts') assert.deepEqual(up[k], v2[k], `${k} must come through the upgrade unchanged`)
  assert.deepEqual(migrate({ expenses: [] }).incomes, []); assert.deepEqual(migrate({ expenses: [] }).rules, {}); assert.deepEqual(migrate(up), up, 'running the migration twice changes nothing')
  // version 4: what a goal had saved becomes its opening contribution, a debt keeps its balance and gains its start date
  assert.deepEqual(up.goals, [{ id: 'g', name: 'Trip', target: 100, color: '#000' }]); assert.deepEqual(up.contributions.map(c => [c.goalId, c.amount, c.date, c.source]), [['g', 40, todayISO(), 'opening']])
  assert.deepEqual(up.debts, [{ ...v2.debts[0], startDate: todayISO() }]); assert.deepEqual([up.payments, up.challenges, up.assets, up.liabilities, up.netWorth, up.plan], [[], [], [], [], [], { method: 'avalanche', extra: 0 }])
  const stale = migrate({ ...up, goals: [{ ...up.goals[0], saved: 65 }] }) // a device still on version 3 added 25 its own way
  assert.deepEqual(stale.contributions.map(c => c.amount), [40, 25]); assert.equal(migrate({ ...up, goals: [{ ...up.goals[0], saved: 40 }] }).contributions.length, 1, 'and its unchanged copy adds nothing')
  assert.deepEqual(migrate({ ...stale, goals: [{ ...up.goals[0], saved: 40 }] }).contributions.map(c => c.amount), [40, 25], 'nor does an old copy cancel what was contributed since')
  assert.equal(migrate({}).categories.length, 12); assert.deepEqual(migrate(null).expenses, [])
  const newer = { ...v2, ledger: [{ month: '2026-01', assets: 5 }] } // written by a later version of the app
  assert.deepEqual((migrate(newer) as unknown as typeof newer).ledger, newer.ledger, 'a field this version does not know is kept')
  const sent = forServer(newer, { ...pickData(migrate(newer)), expenses: [] })
  assert.deepEqual(sent.ledger, newer.ledger, 'and it is sent back to the account untouched'); assert.deepEqual(sent.expenses, [])
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
  useStore.getState().updateSettings({ monthlyLimit: 9 }); assert.equal(useStore.getState().settings.monthlyLimit, 0, 'the monthly limit is data too')
  assert.ok(useStore.getState().activateKey(generateKey('debts')), 'a code can still be entered'); assert.equal(useStore.getState().settings.keys.length, 2)
  useStore.getState().addExpense({ amount: 1, categoryId: 'other', name: 'x', date: '2026-01-01' }); assert.equal(useStore.getState().expenses.length, 0, 'and no code lifts the block')
  loadState({ expenses: [], settings: { ...useStore.getState().settings, keys: ['GOLDABCD1234'] } })
  loadState(JSON.parse(json)); assert.deepEqual(pickData(useStore.getState()), before, 'export then load gives back every record')
  const { useUI } = await import('../src/ui-state')
  useUI.getState().dismissToast()
  loadState({ settings: { ...useStore.getState().settings, firstOpenedAt: Date.now() } })
  useUI.getState().showToast('Saved'); assert.equal(useUI.getState().toast, undefined, 'a refusal is not replaced by the caller\'s success message')
  await new Promise(r => setTimeout(r)); useUI.getState().showToast('Saved'); assert.equal(useUI.getState().toast?.msg, 'Saved', 'the next click toasts as usual')
  useUI.getState().dismissToast()
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
// add-on lists: add, edit, reorder; net worth keeps one snapshot a month and follows every change, an undo included
{
  const { useStore, loadState } = await import('../src/store')
  const { useUI } = await import('../src/ui-state')
  const { deleteWithUndo } = await import('../src/lib/undo')
  const st = useStore.getState
  loadState({ goals: [], contributions: [], debts: [], payments: [], assets: [], liabilities: [], netWorth: [] })
  const a = st().addTo('goals', { name: 'A', target: 10, color: '#000' }), b = st().addTo('goals', { name: 'B', target: 10, color: '#000' })
  st().moveGoal(b.id, -1); st().moveGoal(b.id, -1); assert.deepEqual(st().goals.map(g => g.name), ['B', 'A']); st().patchIn('goals', a.id, { target: 20 }); assert.equal(st().goals[1].target, 20)
  st().setPlan({ extra: 50 }); assert.deepEqual(st().plan, { method: 'avalanche', extra: 50, start: todayISO() }, 'a changed plan is counted from today')
  const debt = st().addTo('debts', { name: 'Card', balance: 500, apr: 0, minPayment: 25, startDate: todayISO() })
  assert.deepEqual(st().netWorth, [{ month: currentMonthKey(), assets: 0, liabilities: 500 }], 'a debt alone starts the net worth history')
  const car = st().addTo('assets', { name: 'Car', kind: 'Vehicle', value: 9000 }); st().addTo('assets', { name: 'Cash', kind: 'Cash', value: 1000 })
  assert.deepEqual(st().netWorth, [{ month: currentMonthKey(), assets: 10000, liabilities: 500 }])
  st().addTo('payments', { debtId: debt.id, amount: 200, date: todayISO() }); assert.equal(st().netWorth[0].liabilities, 300, 'a payment lowers the liability')
  deleteWithUndo('assets', car.id); assert.deepEqual(st().netWorth.map(n => n.assets), [1000]); useUI.getState().toast!.action!.run(); assert.deepEqual(st().netWorth.map(n => n.assets), [10000])
  useUI.getState().dismissToast()
  loadState({ goals: [], debts: [], payments: [], assets: [], netWorth: [], plan: { method: 'avalanche', extra: 0 } })
}

// sync against a stand-in for the account service: a failed pull sends nothing, and a field another device wrote survives a push
{
  const { useStore, loadState } = await import('../src/store')
  const { useAccount } = await import('../src/account')
  const { startSync } = await import('../src/lib/sync')
  const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
  let row: Record<string, unknown> | null = { settings: { currency: 'USD', monthlyLimit: 100, onboarded: true, theme: 'light', monthStartDay: 1, keys: [], firstOpenedAt: Date.now() }, expenses: [E('srv', 7, '2026-01-02')], ledger: [1] }
  let offline = true, writes = 0
  const service = { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => (offline ? { data: null, error: new Error('offline') } : { data: row && { state: row }, error: null }) }) }),
    upsert: async (r: { state: Record<string, unknown> }) => { row = r.state; writes++; return { error: null } },
  }) }
  const signIn = (id: string) => useAccount.setState({ session: { user: { id } } as never, synced: false })
  loadState({ expenses: [E('local', 1, '2026-01-01')] })
  startSync(service as never)
  signIn('u1'); await wait(20)
  assert.equal(useAccount.getState().synced, false, 'a pull that failed leaves the account not loaded'); assert.equal(writes, 0, 'and nothing local is written over the account')
  offline = false; signIn('u2'); await wait(20)
  assert.equal(useAccount.getState().synced, true); assert.deepEqual(useStore.getState().expenses.map(e => e.id), ['srv'], 'the account\'s copy replaces what was local')
  assert.deepEqual(useStore.getState().incomes, [], 'a copy from the previous version gains the new lists'); assert.equal(writes, 0, 'loading the copy is not a change to send')
  row = { ...row!, vault: [2] } // another device, on a newer version, writes while this one stays open
  useStore.getState().addIncome({ amount: 5, source: 'Gift', date: '2026-01-03' }); await wait(900)
  assert.equal(writes, 1); assert.deepEqual([row!.ledger, row!.vault], [[1], [2]], 'fields this version does not know are sent back, including one written after the pull')
  assert.equal((row!.incomes as unknown[]).length, 1); assert.deepEqual((row!.expenses as { id: string }[]).map(e => e.id), ['srv'])
}

console.log('check OK')
process.exit(0) // the failed pull above left its retry timer behind
