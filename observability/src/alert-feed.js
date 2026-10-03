import { component } from 'imp'
import { t } from 'imp/i18n'
import { useHttpClient } from 'imp/http'
import { notify } from 'imp/std/feedback'
import { app } from './app-map.js'

const POLL_EVERY = 15_000

// A component with no DOM: it polls the alerts and raises a notification for
// each new one. The bell in the top bar keeps the list.
export const alertFeed = component('beacon-alert-feed', {
  setup: (self) => {
    const api = useHttpClient(self, 'beacon.api')
    const seen = new Set()

    const poll = async () => {
      const alerts = await api.get('/alerts')
      for (const alert of alerts.filter((alert) => !seen.has(alert.id))) {
        seen.add(alert.id)
        notify({
          id: alert.id,
          kind: alert.severity === 'critical' ? 'error' : 'warning',
          title: alert.title,
          description: alert.description,
          link: {
            href: app.dashboards.$dashboardId.href({ dashboardId: alert.dashboardId }),
            label: t('alerts.open'),
          },
        })
      }
    }

    poll()
    self.timer = setInterval(poll, POLL_EVERY)
    return null
  },
  onRemove: (self) => clearInterval(self.timer),
})
