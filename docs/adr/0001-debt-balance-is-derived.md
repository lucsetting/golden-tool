# 1. A debt stores the balance it started with; what it owes today is worked out

Date: 2026-11-10

## Context

Golden Freedom gained a payment log and a comparison between the real balance and the payoff plan. The payoff plan adds a month of interest before each payment. If logging a payment simply subtracted it from a stored balance, the stored balance would drift below the real one by the interest of every month, and a customer who followed the plan exactly would read as ahead of it.

## Decision

`Debt.balance` is what was owed on `Debt.startDate` and is not changed by payments. What a debt owes today comes from `owed()` in `src/lib/debts.ts`: the starting balance, a month of interest at the start of each later month (the plan's own rule), and every logged payment taken off. Screens read debts through `debtsNow()`.

When the customer types a new balance for a debt that already has history, the difference is stored as a **balance correction** in the payment log, so the plan's starting point stays where it was and the comparison with the plan keeps its meaning. A debt entered this month with no payments has its starting balance changed directly.

The comparison with the plan is counted from `DebtPlan.start`, the day the plan's settings were last changed, starting from what each debt owed that day. Without it, raising the extra amount would rewrite the past and turn a customer who paid everything into one who is behind.

## Alternatives considered

- **Subtract payments from a stored balance, ignore interest.** Simplest, but the balance is wrong after one month and "ahead of plan" is always true.
- **Compare payments made with payments planned, leave the balance to the customer.** Robust, but the balance still needs editing by hand every month, which the payment log was meant to end.
- **Post interest as stored entries each month.** Correct, but a second posting mechanism beside bills, with its own catch-up and sync cases.

## Consequences

- Code that reads `debt.balance` directly gets the starting balance. Use `owed()` or `debtsNow()`.
- Changing a debt's APR recalculates the interest of past months; the edit form keeps the balance the customer sees by writing a correction for the difference.
- Interest is modelled monthly at APR/12. A real statement can differ by a few dollars; the customer corrects the balance when it does.
