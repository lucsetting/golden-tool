import { parseKey, type KeyKind } from './license'
import { ACCESS_DAYS, KIND_UNLOCKS, type ModuleKind } from './modules'
import type { Settings } from '../types'
import { useAccount } from '../account'

/** Everything this person is entitled to: codes entered locally + purchases recorded for the signed-in email. */
export function kindsOf(settings: Settings): KeyKind[] {
  const fromCodes = (settings.keys ?? []).map(parseKey).filter((k): k is KeyKind => k !== null)
  // A purchase of a kind this version does not know (an offer since withdrawn) unlocks nothing.
  const fromPurchases = useAccount.getState().entitlements.filter(e => e.status === 'active' && e.product in KIND_UNLOCKS).map(e => e.product)
  return [...new Set([...fromCodes, ...fromPurchases])]
}
export function hasModule(settings: Settings, m: ModuleKind): boolean {
  return kindsOf(settings).some(k => KIND_UNLOCKS[k].includes(m))
}
export function hasAllModules(settings: Settings): boolean {
  return (['debts', 'goals', 'reports'] as ModuleKind[]).every(m => hasModule(settings, m))
}
/** Timestamp when included access ends, or null when it has not started. */
export function accessUntil(settings: Settings): number | null {
  if (!settings.firstOpenedAt) return null
  return settings.firstOpenedAt + ACCESS_DAYS * 86400000
}
export function daysLeft(settings: Settings, now = Date.now()): number | null {
  const u = accessUntil(settings)
  return u === null ? null : Math.ceil((u - now) / 86400000)
}
/** Read-only once included access ended: data stays visible and exportable, nothing new can be added. */
export function isReadOnly(settings: Settings, now = Date.now()): boolean {
  const u = accessUntil(settings)
  return u !== null && now > u
}
