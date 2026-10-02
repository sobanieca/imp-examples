import { component } from 'imp'
import { div } from 'imp/html'
import { luChartBar, luChartColumn, luChartLine, luGauge, luScrollText, luTable } from 'imp/icons'
import { useHttpClient } from 'imp/http'
import { computed, initState } from 'imp/state'
import { text } from 'imp/std'
import { card, tag } from 'imp/std/display'
import { chart, table } from 'imp/std/data'
import { notice, progress, skeleton } from 'imp/std/feedback'
import { flex } from 'imp/std/layout'

export const PANEL_TYPES = [
  { value: 'line', label: 'Line', icon: luChartLine },
  { value: 'column', label: 'Columns', icon: luChartColumn },
  { value: 'bar', label: 'Bars', icon: luChartBar },
  { value: 'stat', label: 'Stat', icon: luGauge },
  { value: 'table', label: 'Table', icon: luTable },
  { value: 'logs', label: 'Logs', icon: luScrollText },
]

export const PANEL_WIDTHS = [
  { value: 'small', label: '1/3' },
  { value: 'medium', label: '2/3' },
  { value: 'full', label: 'Full' },
]

const round = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
const last = (values) => values.at(-1)
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

// Every metric query answers { unit, max, labels, series }. A Loki query answers { logs }.
// Each panel type is a std component fed with live props: a refresh only sets
// the `data` state, and the chart, gauge or table updates in place.

const lineChart = (panel, data, unit) =>
  chart({
    type: 'line',
    label: panel.title,
    labels: computed([data], (result) => result.labels ?? []),
    series: computed([data], (result) => result.series ?? []),
    format: (value) => `${round(value)} ${unit}`,
  })

// Columns and bars compare the series: the latest value and the mean of each.
const comparisonChart = (panel, data, unit) =>
  chart({
    type: panel.type,
    label: panel.title,
    labels: computed([data], (result) => (result.series ?? []).map((series) => series.name)),
    series: computed([data], (result) => [
      { name: 'Latest', values: (result.series ?? []).map((series) => last(series.values)) },
      { name: 'Mean', values: (result.series ?? []).map((series) => average(series.values)) },
    ]),
    format: (value) => `${round(value)} ${unit}`,
  })

const stat = (panel, data, { unit, max, series }) => {
  const latest = (result) => average((result.series ?? []).map((one) => last(one.values)))
  const scale = max ?? Math.ceil(Math.max(...series.flatMap((one) => one.values)) * 1.2)
  const ratio = latest(data.get()) / scale
  return progress({
    shape: 'gauge',
    size: 'lg',
    label: panel.title,
    value: computed([data], latest),
    max: scale,
    color: ratio > 0.8 ? 'red' : ratio > 0.6 ? 'amber' : 'green',
    format: (value) => `${round(value)} ${unit}`,
  })
}

const summaryTable = (panel, data, unit) =>
  table({
    label: panel.title,
    columns: [
      { key: 'name', label: 'Series', sortable: true },
      ...['last', 'min', 'max', 'mean'].map((key) => ({
        key,
        label: key[0].toUpperCase() + key.slice(1),
        align: 'end',
        sortable: true,
        render: (row) => `${round(row[key])} ${unit}`,
      })),
    ],
    rows: computed([data], (result) =>
      (result.series ?? []).map(({ name, values }) => ({
        id: name,
        name,
        last: last(values),
        min: Math.min(...values),
        max: Math.max(...values),
        mean: average(values),
      }))),
  })

const LEVEL_COLORS = { info: 'blue', warn: 'amber', error: 'red' }

const logTable = (panel, data) =>
  table({
    label: panel.title,
    columns: [
      { key: 'time', label: 'Time' },
      {
        key: 'level',
        label: 'Level',
        render: (row) => tag({ color: LEVEL_COLORS[row.level], size: 'sm' }, row.level),
      },
      { key: 'service', label: 'Service' },
      { key: 'message', label: 'Message' },
    ],
    rows: computed([data], (result) => result.logs ?? []),
  })

const panelBody = (panel, data) => {
  const result = data.get()
  if (result.logs) return logTable(panel, data)
  if (panel.type === 'stat') return stat(panel, data, result)
  if (panel.type === 'table') return summaryTable(panel, data, result.unit)
  if (panel.type === 'line') return lineChart(panel, data, result.unit)
  return comparisonChart(panel, data, result.unit)
}

// One panel: it runs its query on mount and again whenever `query`
// ({ range, tick }) changes, which is how the time picker and refresh work.
export const panelView = component('beacon-panel', {
  styles: `:host { display: block; block-size: 100%; }`,
  setup: (self, { panel, query }) => {
    const api = useHttpClient(self, 'beacon.api')
    const data = initState(self, 'beacon.panel.data')

    query.watch(self, async ({ range }) => {
      try {
        const params = { connectorId: panel.connectorId, metric: panel.metric, range }
        data.set(await api.get('/query', { query: params }))
      } catch (error) {
        data.set({ error: error.body?.message ?? error.message })
      }
    })

    const status = computed([data], (result) => {
      if (result === undefined) return 'loading'
      return result.error ? 'error' : 'ready'
    })

    return card(
      {
        padding: 'sm',
        header: flex(
          { horizontalAlign: 'justify', verticalAlign: 'center' },
          text({ weight: 'bold' }, panel.title || 'Untitled panel'),
          text({ tone: 'secondary', size: 'sm' }, panel.metric),
        ),
      },
      status.view((current) => {
        if (current === 'loading') return skeleton({ lines: 5 })
        if (current === 'error') {
          return notice({ kind: 'error', title: 'Query failed' }, data.get().error)
        }
        return panelBody(panel, data)
      }),
    )
  },
})

// The dashboard layout: a three-column grid, one column on a phone.
export const panelGrid = component('beacon-panel-grid', {
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--imp-space-4);
    }
    .medium { grid-column: span 2; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 48rem) {
      .grid { grid-template-columns: minmax(0, 1fr); }
      .medium { grid-column: auto; }
    }
  `,
  setup: (_self, { panels, query }) =>
    div(
      { class: 'grid' },
      panels.map((panel) => div({ class: panel.width }, panelView({ panel, query }))),
    ),
})
