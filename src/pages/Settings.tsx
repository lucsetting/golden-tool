import { useRef, useState } from 'react'
import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, ArrowUpTrayIcon, ChevronRightIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { useAccount } from '../account'
import { CURRENCIES, todayISO } from '../lib/money'
import { install } from '../lib/install'
import type { Theme } from '../types'
import { Button, Card, CardHeader, CategoryBadge, CategoryIcon, Chip, Dialog, Divider, Field, IconButton, Input, PageHeader, Segmented, Select, SettingRow, TableRow, cx } from '../components/ui'
import CodeInput from '../components/CodeInput'
import { MODULE_ICON } from '../components/Layout'
import { ACCESS_DAYS, LIFETIME, MODULES, KIND_UNLOCKS, REFUND_DAYS } from '../lib/modules'
import { accessUntil, daysLeft, hasModule, isLifetime, isReadOnly } from '../lib/access'
import { formatKey, parseKey, type KeyKind } from '../lib/license'
import RecurringManager from '../components/RecurringManager'
import RefundContent from '../components/RefundContent'
import SetPassword from '../components/SetPassword'

const COLORS = ['#3DBE7A', '#F0A33A', '#4F8EF7', '#A77BF3', '#E4B44A', '#E85D5D', '#F26BA6', '#2CC3C9', '#7DD3FC', '#C084FC', '#86EFAC', '#8E919A']
const ICONS = ['ShoppingCart', 'Utensils', 'Car', 'Home', 'Zap', 'HeartPulse', 'ShoppingBag', 'Clapperboard', 'Repeat', 'Sparkles', 'GraduationCap', 'Circle',
  'Coffee', 'Plane', 'Gift', 'Dumbbell', 'Gamepad2', 'Baby', 'PawPrint', 'Smartphone', 'Wrench', 'Shirt', 'Music', 'Briefcase']
const THEME_OPTIONS: { value: Theme; label: string }[] = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]
const UNLOCKS: Record<KeyKind, string> = Object.fromEntries((Object.keys(KIND_UNLOCKS) as KeyKind[]).map(k => [k, k === 'lifetime' ? 'Lifetime access' : KIND_UNLOCKS[k].map(m => MODULES[m].name).join(', ')])) as Record<KeyKind, string>
// The shared controls are 36px high; phones need 44px targets.
// A button in a SettingRow: right-aligned on desktop, full width on phones.
const ROW_BTN = 'max-sm:w-full sm:flex sm:w-fit sm:ml-auto'
const SEP = 'max-sm:my-6'
const toast = (msg: string, kind?: 'ok' | 'err') => useUI.getState().showToast(msg, kind)

function General() {
  const monthlyLimit = useStore(s => s.settings.monthlyLimit)
  const currency = useStore(s => s.settings.currency)
  const theme = useStore(s => s.settings.theme)
  const [limit, setLimit] = useState(String(monthlyLimit || ''))
  const update = useStore.getState().updateSettings
  const saveLimit = () => {
    const n = parseFloat(limit)
    if (!(n > 0)) { setLimit(String(monthlyLimit)); return toast('Enter a limit above zero', 'err') }
    if (n !== monthlyLimit) { update({ monthlyLimit: n }); toast('Saved') }
  }
  return (
    <div>
      <PageHeader title="General" subtitle="Your limit, currency and appearance." />
      <SettingRow label="Monthly limit" description="The most you want to spend in a month.">
        <Input type="number" inputMode="decimal" min="0" className="tabular-nums" aria-label="Monthly limit" value={limit} onChange={e => setLimit(e.target.value)} onBlur={saveLimit}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
      </SettingRow>
      <Divider className={SEP} />
      <SettingRow label="Currency" description="Used for every amount.">
        <Select aria-label="Currency" value={currency} onChange={e => { update({ currency: e.target.value }); toast('Saved') }}>
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </Select>
      </SettingRow>
      <Divider className={SEP} />
      <SettingRow label="Appearance" description="System follows your device.">
        <Segmented block className="max-sm:h-12 max-sm:[&>button]:h-11" value={theme} options={THEME_OPTIONS} onChange={t => update({ theme: t })} />
      </SettingRow>
      <Divider className={SEP} />
      <div className="text-sm text-foreground">About</div>
      <p className="text-sm text-muted-foreground mt-0.5">Golden Tool 1.0. An educational budgeting tool. It does not provide financial advice.</p>
    </div>
  )
}

type Draft = { id?: string; name: string; icon: string; color: string }

function Categories() {
  const categories = useStore(s => s.categories)
  const [edit, setEdit] = useState<Draft | null>(null)
  const [confirming, setConfirming] = useState(false)
  const open = (d: Draft) => { setEdit(d); setConfirming(false) }
  const save = () => {
    if (!edit || !edit.name.trim()) return toast('Name is required', 'err')
    const { id, ...c } = edit
    const data = { ...c, name: c.name.trim() }
    if (id) useStore.getState().updateCategory(id, data); else useStore.getState().addCategory(data)
    setEdit(null)
    toast('Category saved')
  }
  const remove = () => {
    useStore.getState().deleteCategory(edit!.id!)
    setEdit(null)
    toast('Category deleted')
  }
  return (
    <div>
      <PageHeader title="Categories" subtitle="Rename, recolour or add your own."
        actions={<Button onClick={() => open({ name: '', icon: 'Circle', color: COLORS[0] })}><PlusIcon /><span>Add category</span></Button>} />
      <Card>
        {categories.map(c => (
          <TableRow key={c.id} onClick={() => open({ id: c.id, name: c.name, icon: c.icon, color: c.color })}>
            <CategoryBadge category={c} size={28} />
            <span className="flex-1 truncate text-foreground"><span className="sr-only">Edit </span>{c.name}</span>
            <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          </TableRow>
        ))}
      </Card>

      <Dialog open={!!edit} onClose={() => setEdit(null)}
        title={confirming ? `Delete "${edit?.name}"?` : edit?.id ? 'Edit category' : 'New category'}
        description={confirming ? 'Its expenses and bills will be moved to "Other".' : undefined}>
        {edit && (confirming ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="destructive" className="max-sm:flex-1" onClick={remove}>Delete category</Button>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={e => { e.preventDefault(); save() }}>
            <Field label="Name">
              <Input placeholder="Category name" maxLength={30} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </Field>
            <div>
              <span className="block text-sm text-foreground mb-2">Colour</span>
              <div className="grid grid-cols-6 gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={edit.color === c} onClick={() => setEdit({ ...edit, color: c })}
                    className={cx('t h-11 sm:h-9 rounded-md inline-flex items-center justify-center hover:bg-muted', edit.color === c && 'bg-muted shadow-[inset_0_0_0_1.5px_var(--foreground)]')}>
                    <span className="h-5 w-5 rounded-full" style={{ background: c }} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-sm text-foreground mb-2">Icon</span>
              <div className="grid grid-cols-6 gap-2">
                {ICONS.map(i => (
                  <button key={i} type="button" aria-label={i} aria-pressed={edit.icon === i} onClick={() => setEdit({ ...edit, icon: i })}
                    className={cx('t h-11 sm:h-9 rounded-md inline-flex items-center justify-center hover:bg-muted', edit.icon === i ? 'bg-muted text-foreground shadow-[inset_0_0_0_1.5px_var(--foreground)]' : 'text-muted-foreground')}><CategoryIcon icon={i} /></button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              {edit.id && edit.id !== 'other'
                ? <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>Delete</Button>
                : <span />}
              <Button type="submit" variant="primary" className="max-sm:flex-1">Save</Button>
            </div>
          </form>
        ))}
      </Dialog>
    </div>
  )
}

function Data() {
  const email = useAccount(s => s.session?.user.email)
  const [erasing, setErasing] = useState(false)
  const [word, setWord] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const doExport = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([useStore.getState().exportJSON()], { type: 'application/json' }))
    a.download = `golden-tool-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (f?: File) => {
    if (!f) return
    const ok = useStore.getState().importJSON(await f.text())
    toast(ok ? 'Backup restored' : 'Not a valid Golden Tool backup', ok ? 'ok' : 'err')
    if (file.current) file.current.value = ''
  }
  const closeErase = () => { setErasing(false); setWord('') }
  const erase = () => {
    if (word !== 'ERASE') return
    useStore.getState().resetAll(); closeErase(); toast('All data erased')
  }
  return (
    <div>
      <PageHeader title="Data" subtitle={email ? 'Your data syncs to every device you sign in on.' : 'Your data lives in this browser.'} />
      <SettingRow label="Backup" description="Download a JSON file with everything.">
        <Button className={ROW_BTN} onClick={doExport}><ArrowDownTrayIcon /><span>Export</span></Button>
      </SettingRow>
      <Divider className={SEP} />
      <SettingRow label="Restore" description="Import a backup file.">
        <Button className={ROW_BTN} onClick={() => file.current?.click()}><ArrowUpTrayIcon /><span>Import</span></Button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => doImport(e.target.files?.[0])} />
      </SettingRow>
      <Divider className={SEP} />
      {install.evt
        ? <SettingRow label="Install app" description="Add Golden Tool to your device.">
            <Button className={ROW_BTN} onClick={() => { void install.evt?.prompt(); install.evt = undefined }}>Install</Button>
          </SettingRow>
        : <>
            <div className="text-sm text-foreground">Install app</div>
            <p className="text-sm text-muted-foreground mt-0.5">On iPhone: open in Safari, tap Share &gt; Add to Home Screen.</p>
          </>}
      <Divider className={SEP} />
      <SettingRow label="Erase all data" description="Erases every expense, category, goal and setting on this device. Export a backup first.">
        <Button variant="destructive" className={ROW_BTN} onClick={() => setErasing(true)}><TrashIcon /><span>Erase</span></Button>
      </SettingRow>

      <Dialog open={erasing} onClose={closeErase} width={420} title="Erase all data?" description="Every expense, category, goal and setting on this device is erased. This cannot be undone.">
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); erase() }}>
          <Field label="Type ERASE to confirm">
            <Input autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false} value={word} onChange={e => setWord(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeErase}>Cancel</Button>
            <Button type="submit" variant="destructive" className="max-sm:flex-1" disabled={word !== 'ERASE'}>Erase all data</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

function Billing() {
  const settings = useStore(s => s.settings)
  const email = useAccount(s => s.session?.user.email)
  const [pwOpen, setPwOpen] = useState(false)
  const life = isLifetime(settings)
  const ended = isReadOnly(settings)
  const until = accessUntil(settings)
  const untilText = until ? new Date(until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const accessText = life ? 'Lifetime access. No renewals.' : !until ? `Included access lasts ${ACCESS_DAYS} days from first use.`
    : ended ? `Included access ended ${untilText}. You can view and export; adding is paused.` : `Included access ends ${untilText} (${daysLeft(settings)} days).`
  return (
    <div>
      <PageHeader title="Billing" subtitle="Your plan, add-ons and activation codes." />
      {email && (<>
        <SettingRow label="Account" description={email}>
          <div className="flex gap-2 sm:justify-end">
            <Button className="max-sm:flex-1" onClick={() => setPwOpen(true)}>{useAccount.getState().hasPassword() ? 'Change password' : 'Create password'}</Button>
            <Button className="max-sm:flex-1" onClick={() => { void useAccount.getState().signOut(); useUI.getState().setTab('home') }}>Sign out</Button>
          </div>
        </SettingRow>
        <SetPassword open={pwOpen} onClose={() => setPwOpen(false)} />
        <Divider className={SEP} />
      </>)}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Golden Tool</span>
          <Chip tone={life ? 'lifetime' : ended ? 'bad' : 'outline'}>{life ? 'Lifetime' : ended ? 'Ended' : 'Active'}</Chip>
          <span className="ml-auto text-sm text-muted-foreground">{life ? 'Lifetime' : `${ACCESS_DAYS} days included`}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{accessText}</p>
        {!life && <Button variant="primary" className="mt-4 max-sm:w-full" onClick={() => window.open(LIFETIME.checkoutUrl, '_blank', 'noopener')}><ArrowTopRightOnSquareIcon /><span>Get lifetime access</span></Button>}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Add-ons" />
        {Object.values(MODULES).map(m => {
          const Icon = MODULE_ICON[m.kind]
          const on = hasModule(settings, m.kind)
          return (
            <TableRow key={m.kind}>
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 min-w-0 truncate text-foreground">{m.name}</span>
              <span className="text-muted-foreground">{on ? 'Included' : m.price}</span>
              {on ? <Chip tone="outline">Active</Chip> : <Button onClick={() => window.open(m.checkoutUrl, '_blank', 'noopener')}>Add</Button>}
            </TableRow>
          )
        })}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Activation codes" />
        <CodeInput className="p-4" />
        {settings.keys.map(k => { const kd = parseKey(k); return kd && (
          <TableRow key={k} className="border-t border-b-0 pr-2">
            <span className="flex-1 min-w-0">
              <span className="block font-mono text-foreground">{formatKey(k)}</span>
              <span className="block truncate text-xs text-muted-foreground">{UNLOCKS[kd]}</span>
            </span>
            <IconButton label="Remove code" className="shrink-0" onClick={() => { useStore.getState().updateSettings({ keys: settings.keys.filter(x => x !== k) }); toast('Code removed') }}><TrashIcon /></IconButton>
          </TableRow>
        ) })}
      </Card>
    </div>
  )
}

export default function Settings() {
  const tab = useUI(s => s.tab)
  if (tab === 'settings-categories') return <Categories />
  if (tab === 'settings-data') return <Data />
  if (tab === 'settings-billing') return <Billing />
  if (tab === 'settings-recurring') return (
    <div>
      <PageHeader title="Bills" subtitle="Bills added as expenses automatically every month." />
      <RecurringManager />
    </div>
  )
  if (tab === 'settings-refund') return (
    <div>
      <PageHeader title="Refund" subtitle={`Every purchase is covered by a ${REFUND_DAYS}-day money-back guarantee through Digistore24.`} />
      <RefundContent narrow />
    </div>
  )
  return <General />
}
