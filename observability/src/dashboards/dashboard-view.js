import { component } from 'imp'
import { luPencil, luRefreshCw, luSearch } from 'imp/icons'
import { useHttpClient } from 'imp/http'
import { navigate } from 'imp/router'
import { computed, initState } from 'imp/state'
import { button, heading, icon, text } from 'imp/std'
import { emptyState, tag, tooltip } from 'imp/std/display'
import { skeleton } from 'imp/std/feedback'
import { segmented, select } from 'imp/std/inputs'
import { flex, stack } from 'imp/std/layout'
import { app } from '../app-map.js'
import { panelGrid } from './panel.js'

const RANGES = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
]

const REFRESH = [
  { value: 'off', label: 'Auto refresh off' },
  { value: '10', label: 'Every 10 seconds' },
  { value: '30', label: 'Every 30 seconds' },
]

export const dashboardView = component('beacon-dashboard-view', {
  loading: () => skeleton({ lines: 8 }),
  setup: async (self, { id }) => {
    const api = useHttpClient(self, 'beacon.api')
    const range = initState(self, 'beacon.range', '1h')
    const tick = initState(self, 'beacon.tick', 0)
    const refreshEvery = initState(self, 'beacon.refreshEvery', 'off')

    // Every panel watches this one value. A new range or a new tick re-runs all queries.
    const query = computed([range, tick], (range, tick) => ({ range, tick }))
    const refresh = () => tick.set((count) => count + 1)

    refreshEvery.watch(self, (seconds) => {
      clearInterval(self.timer)
      if (seconds !== 'off') self.timer = setInterval(refresh, seconds * 1000)
    })

    const dashboard = await api.get(`/dashboards/${id}`)
    const edit = () => navigate(app.dashboards.$dashboardId.edit.href({ dashboardId: id }))

    return stack(
      { gap: 4 },
      flex(
        { horizontalAlign: 'justify', verticalAlign: 'center', wrap: true },
        stack(
          { gap: 1 },
          heading(dashboard.title),
          flex(
            { gap: 2, verticalAlign: 'center', wrap: true },
            text({ tone: 'secondary', inline: true }, dashboard.description),
            dashboard.tags.map((name) => tag({ size: 'sm', color: 'violet' }, name)),
          ),
        ),
        flex(
          { gap: 2, verticalAlign: 'center', wrap: true },
          segmented({ value: range, ariaLabel: 'Time range', options: RANGES }),
          select({ value: refreshEvery, ariaLabel: 'Auto refresh', options: REFRESH }),
          tooltip(
            { text: 'Refresh now' },
            button(
              { square: true, label: 'Refresh now', events: { click: refresh } },
              icon(luRefreshCw),
            ),
          ),
          button({ events: { click: edit } }, icon(luPencil, { size: 'sm' }), 'Edit'),
        ),
      ),
      dashboard.panels.length > 0 ? panelGrid({ panels: dashboard.panels, query }) : emptyState(
        { title: 'No panels yet', description: 'Open the editor and add the first panel.' },
        button({ variant: 'primary', events: { click: edit } }, 'Add a panel'),
      ),
    )
  },
  onRemove: (self) => clearInterval(self.timer),
  error: () =>
    emptyState({
      icon: luSearch,
      kind: 'error',
      title: 'Dashboard not found',
      description: 'It may have been deleted.',
    }),
})
