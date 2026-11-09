export interface InstallEvent extends Event { prompt: () => Promise<void> }
/** Captured at module load so the event isn't missed before Settings mounts. */
export const install: { evt?: InstallEvent } = {}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); install.evt = e as InstallEvent })
addEventListener('appinstalled', () => { install.evt = undefined })
