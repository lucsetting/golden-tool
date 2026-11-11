# Golden Tool

A personal spending-control app: the customer sets a monthly limit, records money in and out, and sees whether the month is on track. Paid add-ons extend it to debts, savings and long-range reports.

## Language

### Core (included with the main product)

**Expense**:
One amount of money spent, on a date, in one category.
_Avoid_: Transaction, purchase, spend

**Income**:
One amount of money received, on a date, from a named source.
_Avoid_: Earning, deposit, revenue

**Monthly income**:
An income that is added again on the same day of every later month.
_Avoid_: Recurring income, salary, paycheck

**Monthly limit**:
The single ceiling the customer sets for total expenses in a month.
_Avoid_: Budget, cap, allowance

**Budget**:
A ceiling for one category in a month. The monthly limit is not a budget.
_Avoid_: Category limit, cap, envelope

**Cash flow**:
Income minus expenses for a month.
_Avoid_: Balance, net, leftover

**Savings rate**:
Cash flow as a share of income for a month.

**Safe to spend**:
What can still be spent per day without passing the monthly limit.

**Bill**:
An expense that repeats every month on a known day.
_Avoid_: Recurring, recurring expense, fixed cost

**Paused bill**:
A bill the customer switched off: it stays in the list and posts nothing until switched on again.
_Avoid_: Inactive, disabled, archived

**Subscription**:
A bill for a service the customer could cancel.

**Category**:
The kind of thing an expense paid for. Customers can create their own.

**Hidden category**:
A category that came with the app and that the customer took out of the pickers. Expenses already in it keep it.
_Avoid_: Archived, deleted, disabled

**Tag**:
A free label on an expense that cuts across categories, such as a trip.
_Avoid_: Label, group

**Category rule**:
A remembered link from a merchant name to a category, used to suggest the category next time.
_Avoid_: Auto-rule, mapping

**Statement import**:
Turning a bank's CSV file into expenses and income.
_Avoid_: Upload, sync, bank connection

**Weekly recap**:
A summary of the last seven days compared with the seven before.

**Streak**:
The count of consecutive days, or months, kept within the limit.

### Access

**Add-on**:
A paid section bought separately: Golden Freedom, Golden Goals or Golden Vision. Without it the section is locked.
_Avoid_: Module, upsell, Pro, plan

**Included access**:
The 365 days of full use that come with the main product; after it the app is read-only.

### Golden Freedom (debts)

**Debt**:
A balance owed with an interest rate and a minimum payment.
_Avoid_: Loan, liability

**Payoff plan**:
The month-by-month order of payments that brings every debt to zero.
_Avoid_: Schedule, planner

**Strategy**:
The rule that orders debts in a payoff plan: snowball (smallest balance first) or avalanche (highest rate first).

**Payment**:
Money the customer actually paid toward a debt, as opposed to what the payoff plan expected.

**Balance correction**:
A change the customer makes to what a debt owes so it matches a statement. It is kept in the payment log and is not a payment.
_Avoid_: Adjustment, manual payment

**What-if**:
A trial payoff plan with an extra monthly amount or a one-off payment, compared with the current one.
_Avoid_: Simulation, scenario

**Ahead of plan / behind plan**:
The real total balance compared with the balance the payoff plan expected for the current month, counted from when the first debt was entered.

**Minimum only**:
One debt paid with its minimum payment alone, outside the payoff plan: how long it takes and what it costs.

### Golden Goals (savings)

**Goal**:
A target amount to save, optionally by a date.

**Contribution**:
Money the customer set aside toward a goal on a date.
_Avoid_: Deposit, top-up

**Safe to save**:
What can be moved to goals this month without passing the monthly limit.

**Opening amount**:
What was already saved toward a goal before its contributions were recorded. It counts as saved, never as pace.

**Goal pace**:
What the customer set aside for a goal per month over the last three months.

**Priority**:
The order of the goals. The automatic plan serves the top of the list first.

**Automatic plan**:
This month's safe to save split over the goals by priority: each goal first gets what its deadline needs, the rest goes to the first goal with room.
_Avoid_: Allocation, auto-save

**Milestone**:
A quarter mark of a goal: 25, 50, 75 or 100 percent.

**Savings challenge**:
A fixed pattern to follow for a while: the 52-week challenge or the no-spend week.

**52-week challenge**:
A savings challenge where week n asks for n times a base amount, each completed week becoming a contribution to one goal.

**No-spend week**:
A savings challenge of seven days with no expenses outside the categories the customer allows. Bills do not count.

**Emergency fund**:
The goal sized from the customer's essential expenses, three to six months of them.

### Golden Vision (reports)

**Net worth**:
Assets minus liabilities at a point in time.

**Asset**:
Something the customer owns that has a money value.

**Liability**:
Something the customer owes, counted in net worth. Every debt is a liability; a liability need not be a debt in a payoff plan.

**Snapshot**:
Net worth as it stood in one month. One is kept per month in which a value changed.

**Trend**:
A category's expenses over the last twelve months.

**Unusually high**:
A category whose month so far, scaled to the full month, is more than 40 percent and at least 50 above its average of the previous three months.
_Avoid_: Anomaly, alert, warning (in the interface)

**Rollover**:
The unused part of a budget carried into the next month, never more than one month of that budget.

**Needs and wants**:
The two groups every category belongs to for the 50/30/20 preset: half of the income for needs, 30 percent for wants, the rest as a savings target.

**Forecast**:
The expected total for the year if the current pace holds.
_Avoid_: Projection (that word is for the current month only)
