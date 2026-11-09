import { useRef, useState } from 'react'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PencilIcon, PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { useAccount } from '../account'
import { CURRENCIES, todayISO } from '../lib/money'
import { install } from '../lib/install'
import type { Category, Theme } from '../types'
import { Button, CategoryBadge, CategoryIcon, Chip, Dialog, Divider, Field, IconButton, Input, PageHeader, Segmented, Select, SettingRow, cx } from '../components/ui'
import CodeInput from '../components/CodeInput'
import { MODULE_ICON } from '../components/Layout'
import { ACCESS_DAYS, LIFETIME, MODULES, KIND_UNLOCKS, REFUND_DAYS } from '../lib/modules'
import { accessUntil, daysLeft, hasModule, isLifetime, isReadOnly } from '../lib/access'
import { formatKey, parseKey, type KeyKind } from '../lib/license'
import RecurringManager from '../components/RecurringManager'
import RefundContent from '../components/RefundContent'
import SetPassword from '../components/SetPassword'
import { ArrowTopRightOnSquareIcon, TrashIcon } from '@heroicons/react/16/solid'

const COLORS = ['#3DBE7A', '#F0A33A', '#4F8EF7', '#A77BF3', '#E4B44A', '#E85D5D', '#F26BA6', '#2CC3C9', '#7DD3FC', '#C084FC', '#86EFAC', '#8E919A']
const ICONS = ['ShoppingCart', 'Utensils', 'Car', 'Home', 'Zap', 'HeartPulse', 'ShoppingBag', 'Clapperboard', 'Repeat', 'Sparkles', 'GraduationCap', 'Circle',
  'Coffee', 'Plane', 'Gift', 'Dumbbell', 'Gamepad2', 'Baby', 'PawPrint', 'Smartphone', 'Wrench', 'Shirt', 'Music', 'Briefcase']
const THEME_OPTIONS: { value: Theme; label: string }[] = [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]
const UNLOCKS: Record<KeyKind, string> = Object.fromEntries((Object.keys(KIND_UNLOCKS) as KeyKind[]).map(k => [k, k === 'lifetime' ? 'Lifetime access' : KIND_UNLOCKS[k].map(m => MODULES[m].name).join(', ')])) as Record<KeyKind, string>
const RING = 'ring-2 ring-foreground ring-offset-2 ring-offset-card'

function Head({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <PageHeader title={title} subtitle={subtitle} />
  )
}

type Draft = { id?: string; name: string; icon: string; color: string }

export default function Settings() {
  const tab = useUI(s => s.tab)
  const toast = useUI(s => s.showToast)
  const email = useAccount(s => s.session?.user.email)
  const { settings, categories, updateSettings, addCategory, updateCategory, deleteCategory, exportJSON, importJSON, resetAll } = useStore()
  const [limit, setLimit] = useState(String(settings.monthlyLimit || ''))
  const [edit, setEdit] = useState<Draft | null>(null)
  const [word, setWord] = useState('')
  const [pwOpen, setPwOpen] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const saveLimit = () => {
    const n = parseFloat(limit)
    if (!(n > 0)) { setLimit(String(settings.monthlyLimit)); return toast('Enter a limit above zero', 'err') }
    if (n !== settings.monthlyLimit) { updateSettings({ monthlyLimit: n }); toast('Saved') }
  }

  const saveCat = () => {
    if (!edit || !edit.name.trim()) return toast('Name is required', 'err')
    const { id, ...c } = edit
    const data = { ...c, name: c.name.trim() }
    if (id) updateCategory(id, data); else addCategory(data)
    setEdit(null)
    toast('Category saved')
  }
  const removeCat = (c: Category) => {
    if (!confirm(`Delete "${c.name}"? Its expenses and recurring items will be moved to "Other".`)) return
    deleteCategory(c.id)
    setEdit(null)
    toast('Category deleted')
  }

  const doExport = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }))
    a.download = `golden-tool-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (f?: File) => {
    if (!f) return
    const ok = importJSON(await f.text())
    toast(ok ? 'Backup restored' : 'Not a valid Golden Tool backup', ok ? 'ok' : 'err')
    if (file.current) file.current.value = ''
  }

  const life = isLifetime(settings)
  const until = accessUntil(settings)
  const untilText = until ? new Date(until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const accessText = life ? 'Lifetime access. No renewals.' : !until ? `Included access lasts ${ACCESS_DAYS} days from first use.`
    : isReadOnly(settings) ? `Included access ended ${untilText}. You can view and export; adding is paused.` : `Included access ends ${untilText} (${daysLeft(settings)} days).`

  if (tab === 'settings-categories') return (
    <div>
      <Head title="Categories" subtitle="Rename, recolour or add your own." />
      <div className="rounded-[20px] bg-card border border-border overflow-hidden divide-y divide-border">
        {categories.map(c => (
          <div key={c.id} className="h-[52px] px-4 flex items-center gap-3">
            <CategoryBadge category={c} size={24} />
            <span className="flex-1 truncate text-sm text-foreground">{c.name}</span>
            <IconButton label={`Edit ${c.name}`} size="sm" onClick={() => setEdit({ id: c.id, name: c.name, icon: c.icon, color: c.color })}><PencilIcon /></IconButton>
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={() => setEdit({ name: '', icon: 'Circle', color: COLORS[0] })}><PlusIcon /> Add category</Button>

      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'New category'}>
        {edit && (
          <div className="space-y-6">
            <Field label="Name">
              <Input placeholder="Category name" maxLength={30} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </Field>
            <div>
              <span className="block text-sm text-foreground mb-3">Colour</span>
              <div className="flex flex-wrap gap-3">
                {COLORS.map(c => (
                  <button key={c} aria-label={c} aria-pressed={edit.color === c} onClick={() => setEdit({ ...edit, color: c })}
                    className={cx('h-7 w-7 rounded-full', edit.color === c && RING)} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <span className="block text-sm text-foreground mb-3">Icon</span>
              <div className="grid grid-cols-6 gap-2">
                {ICONS.map(i => (
                  <button key={i} aria-label={i} aria-pressed={edit.icon === i} onClick={() => setEdit({ ...edit, icon: i })}
                    className={cx('h-9 w-9 rounded-lg bg-muted text-foreground inline-flex items-center justify-center', edit.icon === i && RING)}><CategoryIcon icon={i} /></button>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-2">
              {edit.id && edit.id !== 'other'
                ? <Button variant="destructive" onClick={() => removeCat(categories.find(c => c.id === edit.id)!)}>Delete</Button>
                : <span />}
              <Button variant="primary" onClick={saveCat}>Save</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )

  if (tab === 'settings-recurring') return (
    <div>
      <Head title="Recurring" subtitle="Expenses added automatically every month." />
      <RecurringManager />
    </div>
  )

  if (tab === 'settings-data') return (
    <div>
      <Head title="Data" subtitle="Your data lives in this browser." />
      <SettingRow label="Backup" description="Download a JSON file with everything.">
        <Button size="sm" onClick={doExport}><ArrowDownTrayIcon /> Export</Button>
      </SettingRow>
      <Divider />
      <SettingRow label="Restore" description="Import a backup file.">
        <Button size="sm" onClick={() => file.current?.click()}><ArrowUpTrayIcon /> Import</Button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => doImport(e.target.files?.[0])} />
      </SettingRow>
      <Divider />
      <SettingRow label="Install app" description={install.evt ? 'Add Golden Tool to your device.' : 'On iPhone: open in Safari, tap Share > Add to Home Screen.'}>
        {install.evt && <Button size="sm" onClick={() => { void install.evt?.prompt(); install.evt = undefined }}>Install</Button>}
      </SettingRow>
      <Divider />
      <div>
        <div className="text-base text-destructive">Danger zone</div>
        <p className="text-sm text-muted-foreground mt-2 leading-5">Erases every expense, category, goal and setting on this device. Export a backup first.</p>
        <div className="flex gap-2 mt-4">
          <Input className="h-8" placeholder="Type ERASE" value={word} onChange={e => setWord(e.target.value)} />
          <Button variant="destructive" size="sm" className="shrink-0" disabled={word !== 'ERASE'}
            onClick={() => { resetAll(); setWord(''); toast('All data erased') }}>Erase all data</Button>
        </div>
      </div>
    </div>
  )

  if (tab === 'settings-refund') return (
    <div>
      <Head title="Refund" subtitle={`Every purchase is covered by a ${REFUND_DAYS}-day money-back guarantee through Digistore24.`} />
      <RefundContent narrow />
    </div>
  )

  if (tab === 'settings-billing') return (
    <div>
      <Head title="Billing" subtitle="Your plan, add-ons and activation codes." />
      {email && (<>
        <SettingRow label="Account" description={email}>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setPwOpen(true)}>{useAccount.getState().hasPassword() ? 'Change password' : 'Create password'}</Button>
            <Button size="sm" onClick={() => { void useAccount.getState().signOut(); useUI.getState().setTab('home') }}>Sign out</Button>
          </div>
          <SetPassword open={pwOpen} onClose={() => setPwOpen(false)} />
        </SettingRow>
        <Divider />
      </>)}
      <section className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="h-9 w-9 rounded-full bg-muted-2 text-foreground inline-flex items-center justify-center text-sm font-medium">{email ? email[0].toUpperCase() : 'G'}</span>
          {!life && <Button size="sm" variant="primary" onClick={() => window.open(LIFETIME.checkoutUrl, '_blank', 'noopener')}><ArrowTopRightOnSquareIcon /><span>Get lifetime access</span></Button>}
        </div>
        <div className="mt-6 flex items-center gap-2">
          <span className="text-sm text-foreground">Golden Tool</span>
          <span className="text-sm text-muted-foreground">{life ? 'Lifetime' : `${ACCESS_DAYS} days included`}</span>
          <Chip tone={life ? 'lifetime' : isReadOnly(settings) ? 'bad' : 'outline'}>{life ? 'Lifetime' : isReadOnly(settings) ? 'Ended' : 'Active'}</Chip>
        </div>
        <p className="text-sm text-muted-foreground mt-2 leading-5">{accessText}</p>
      </section>

      <div className="mt-6 rounded-2xl bg-muted/30 border border-border">
        <div className="h-12 px-4 flex items-center text-sm text-foreground">Add-ons</div>
        <div className="bg-card border-t border-border rounded-2xl">
          {Object.values(MODULES).map((m, i, arr) => {
            const Icon = MODULE_ICON[m.kind]
            const on = hasModule(settings, m.kind)
            return (
              <div key={m.kind} className={cx('h-11 px-4 flex items-center gap-3', i < arr.length - 1 && 'border-b border-border')}>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground">{m.name}</span>
                <span className="text-sm text-muted-foreground">{on ? 'Included' : m.price}</span>
                {on ? <Chip tone="outline">Active</Chip> : <Button size="sm" onClick={() => window.open(m.checkoutUrl, '_blank', 'noopener')}>Add</Button>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-muted/30 border border-border">
        <div className="h-12 px-4 flex items-center text-sm text-foreground">Activation codes</div>
        <div className="bg-card border-t border-border rounded-2xl p-4">
          <CodeInput compact />
          {settings.keys.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {settings.keys.map(k => { const kd = parseKey(k); if (!kd) return null; return (
                <li key={k} className="h-10 flex items-center gap-3 text-sm">
                  <span className="font-mono text-foreground">{formatKey(k)}</span>
                  <span className="flex-1 text-muted-foreground truncate">{UNLOCKS[kd]}</span>
                  <IconButton size="sm" label="Remove code" onClick={() => { updateSettings({ keys: settings.keys.filter(x => x !== k) }); toast('Code removed') }}><TrashIcon /></IconButton>
                </li>
              ) })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <Head title="General" subtitle="Your limit, currency and appearance." />
      <SettingRow label="Monthly limit" description="The most you want to spend in a month.">
        <Input type="number" inputMode="decimal" min="0" className="h-8 tabular-nums" value={limit} onChange={e => setLimit(e.target.value)} onBlur={saveLimit}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
      </SettingRow>
      <Divider />
      <SettingRow label="Currency">
        <Select className="h-8" value={settings.currency} onChange={e => { updateSettings({ currency: e.target.value }); toast('Saved') }}>
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </Select>
      </SettingRow>
      <Divider />
      <SettingRow label="Appearance">
        <Segmented className="w-full" value={settings.theme} options={THEME_OPTIONS} onChange={theme => updateSettings({ theme })} />
      </SettingRow>
      <Divider />
      <div>
        <div className="text-base text-foreground">About</div>
        <p className="text-sm text-muted-foreground mt-2 leading-5">Golden Tool 1.0. An educational budgeting tool. It does not provide financial advice.</p>
      </div>
    </div>
  )
}
