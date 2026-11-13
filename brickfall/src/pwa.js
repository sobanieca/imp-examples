import { component } from 'imp'
import { div, span } from 'imp/html'
import { luDownload } from 'imp/icons'
import { computed, initState } from 'imp/state'
import { button, icon } from 'imp/std'
import { tag } from 'imp/std/display'
import { notice } from 'imp/std/feedback'

// What imp gives a PWA is in imp.json and `imp build --pwa`: the manifest, the
// icon set rendered from icon.svg, and the offline service worker. This file
// is only the app's side of it: an Install button and the state of the worker.

// Chrome and Edge offer the install once, early, maybe before the app mounts.
// Kept here, the offer is still there when the Install button renders.
let installOffer = null
addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  installOffer = event
})

const runningAsApp = () =>
  matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches
  || navigator.standalone === true

// Safari has no install prompt: on an iPhone the way in is the Share menu.
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

const installState = () => {
  if (runningAsApp()) return 'app'
  if (installOffer) return 'offer'
  return isIos() ? 'ios' : 'none'
}

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms, null))

// The built page registers sw.js on load. `imp start` runs imp's own dev worker
// instead, at /@imp/sw.js: it serves mocks and logs requests, but caches nothing.
const workerState = async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported'
  // ready settles once a worker is active, so its install, which fills the cache
  // with every file of the build, is done. A build without --pwa has no worker,
  // and ready never settles.
  const registration = await Promise.race([navigator.serviceWorker.ready, timeout(10000)])
  if (!registration) return 'none'
  return new URL(registration.active.scriptURL).pathname.startsWith('/@imp/') ? 'dev' : 'ready'
}

const WORKER_TAGS = {
  checking: { color: 'gray', text: 'Checking offline mode' },
  unsupported: { color: 'gray', text: 'No offline support' },
  none: { color: 'gray', text: 'Online only' },
  dev: { color: 'amber', text: 'Dev server: no offline cache' },
  ready: { color: 'green', text: 'Ready offline' },
}

const styles = `
  .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--imp-space-2, 8px); }
  .hint { font-size: var(--imp-font-size-sm, 0.875rem); color: var(--imp-color-secondary, #94a3b8); }
  .offline { flex-basis: 100%; }
`

export const pwaStatus = component('brickfall-pwa-status', {
  styles,
  setup: (self) => {
    const install = initState(self, 'brickfall.install', installState())
    const online = initState(self, 'brickfall.online', navigator.onLine)
    const worker = initState(self, 'brickfall.worker', 'checking')

    const signal = self.abortSignal
    addEventListener('beforeinstallprompt', () => install.set(installState()), { signal })
    addEventListener(
      'appinstalled',
      () => {
        installOffer = null
        install.set('installed')
      },
      { signal },
    )
    addEventListener('online', () => online.set(true), { signal })
    addEventListener('offline', () => online.set(false), { signal })
    workerState().then((state) => signal.aborted || worker.set(state))

    const promptInstall = async () => {
      const offer = installOffer
      if (!offer) return
      installOffer = null
      offer.prompt()
      const { outcome } = await offer.userChoice
      install.set(outcome === 'accepted' ? 'installed' : installState())
    }

    return div(
      { class: 'bar' },
      worker.view((state) =>
        tag({ color: WORKER_TAGS[state].color, dot: true }, WORKER_TAGS[state].text),
      ),
      online.view((on) =>
        tag({ color: on ? 'green' : 'red', dot: true }, on ? 'Online' : 'Offline'),
      ),
      install.view((state) => {
        if (state === 'offer') {
          return button(
            { variant: 'primary', size: 'sm', events: { click: promptInstall } },
            icon(luDownload, { size: 'sm' }),
            'Install',
          )
        }
        if (state === 'app') return tag({ color: 'cyan' }, 'Running as an app')
        if (state === 'installed') return tag({ color: 'cyan' }, 'Installed')
        if (state === 'ios') {
          return span({ class: 'hint' }, 'Install: Share, then Add to Home Screen')
        }
        return null
      }),
      div(
        { class: 'offline' },
        notice(
          { kind: 'info', title: 'You are offline', open: computed([online], (on) => !on) },
          'Brickfall keeps running from its cache, and your best score stays on this device.',
        ),
      ),
    )
  },
})
