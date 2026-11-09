// Activation codes: PREFIX-XXXX-YYYY where YYYY = checksum(PREFIX + XXXX).
// Prefix says what the code unlocks. ponytail: client-side check only; move to a server check if piracy matters.
// Set VITE_LICENSE_SECRET at build time (GitHub Actions secret LICENSE_SECRET); gen-keys.mjs must use the same value.
const SECRET = (import.meta.env?.VITE_LICENSE_SECRET as string | undefined) ?? 'golden-tool-2026'
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type KeyKind = 'all' | 'debts' | 'goals' | 'reports' | 'lifetime'
export const PREFIXES: Record<string, KeyKind> = { GOLD: 'all', DEBT: 'debts', GOAL: 'goals', RPRT: 'reports', LIFE: 'lifetime' }
export const PREFIX_OF: Record<KeyKind, string> = { all: 'GOLD', debts: 'DEBT', goals: 'GOAL', reports: 'RPRT', lifetime: 'LIFE' }

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h
}
export function checksum(prefixAndPart: string): string {
  let h = hash(prefixAndPart.toUpperCase() + SECRET)
  let out = ''
  for (let i = 0; i < 4; i++) { out += ALPHA[h % ALPHA.length]; h = Math.floor(h / ALPHA.length) }
  return out
}
export function normalizeKey(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
export function formatKey(input: string): string {
  const k = normalizeKey(input).slice(0, 12)
  return [k.slice(0, 4), k.slice(4, 8), k.slice(8, 12)].filter(Boolean).join('-')
}
/** What a code unlocks, or null when invalid. */
export function parseKey(input: string): KeyKind | null {
  const k = normalizeKey(input)
  if (k.length !== 12) return null
  const kind = PREFIXES[k.slice(0, 4)]
  if (!kind) return null
  return checksum(k.slice(0, 8)) === k.slice(8, 12) ? kind : null
}
export function isValidKey(input: string): boolean { return parseKey(input) !== null }
export function generateKey(kind: KeyKind = 'all', rand: () => number = Math.random): string {
  const prefix = PREFIX_OF[kind]
  let part = ''
  for (let i = 0; i < 4; i++) part += ALPHA[Math.floor(rand() * ALPHA.length)]
  return `${prefix}-${part}-${checksum(prefix + part)}`
}
