import { component } from 'imp'
import { luPlus, luTrash2 } from 'imp/icons'
import { useHttpClient } from 'imp/http'
import { computed, initState } from 'imp/state'
import { button, heading, icon, text } from 'imp/std'
import { table } from 'imp/std/data'
import { tag } from 'imp/std/display'
import { notify, skeleton } from 'imp/std/feedback'
import { form, select, textField, toggle } from 'imp/std/inputs'
import { dialog, flex, stack } from 'imp/std/layout'
import { submitButton } from '../submit-button.js'

const TYPES = [
  { value: 'prometheus', label: 'Prometheus', color: 'orange' },
  { value: 'loki', label: 'Loki', color: 'teal' },
  { value: 'postgres', label: 'PostgreSQL', color: 'blue' },
  { value: 'cloudwatch', label: 'CloudWatch', color: 'pink' },
]

const STATUS = {
  untested: { color: 'gray', label: 'Not tested' },
  ok: { color: 'green', label: 'Working' },
  failing: { color: 'red', label: 'Failing' },
}

const typeOf = (connector) => TYPES.find((type) => type.value === connector.type) ?? TYPES[0]

export const connectorList = component('beacon-connector-list', {
  loading: () => skeleton({ lines: 6 }),
  setup: async (self) => {
    const api = useHttpClient(self, 'beacon.api')
    const connectors = initState(self, 'beacon.connectors', [])
    const statuses = initState(self, 'beacon.connectors.status', {})
    const adding = initState(self, 'beacon.connectors.adding', false)

    const reload = async () => connectors.set(await api.get('/connectors'))
    const setStatus = (id, status) => statuses.set((all) => ({ ...all, [id]: status }))

    const test = async (connector) => {
      try {
        const { latency } = await api.post(`/connectors/${connector.id}/test`, {
          track: `test.${connector.id}`,
        })
        setStatus(connector.id, 'ok')
        notify({
          kind: 'success',
          title: `${connector.name} is working`,
          description: `It answered in ${latency} ms.`,
          ttl: 0,
        })
      } catch (error) {
        setStatus(connector.id, 'failing')
        notify({
          kind: 'error',
          title: `${connector.name} is not reachable`,
          description: error.body?.message ?? error.message,
        })
      }
    }

    const remove = async (connector) => {
      await api.delete(`/connectors/${connector.id}`)
      await reload()
      notify({ kind: 'success', title: `${connector.name} removed`, ttl: 0 })
    }

    const create = async (values) => {
      const connector = await api.post('/connectors', { body: values })
      await reload()
      adding.set(false)
      notify({ kind: 'success', title: `${connector.name} added`, ttl: 0 })
    }

    const rows = computed(
      [connectors, statuses],
      (all, status) =>
        all.map((connector) => ({ ...connector, status: status[connector.id] ?? 'untested' })),
    )

    await reload()

    return stack(
      { gap: 4 },
      flex(
        { horizontalAlign: 'justify', verticalAlign: 'center' },
        stack(
          { gap: 1 },
          heading('Connectors'),
          text({ tone: 'secondary' }, 'The data sources that dashboard panels query.'),
        ),
        button(
          { variant: 'primary', events: { click: () => adding.set(true) } },
          icon(luPlus, { size: 'sm' }),
          'Add connector',
        ),
      ),
      table({
        label: 'Connectors',
        rows,
        columns: [
          {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (row) =>
              flex(
                { gap: 2, verticalAlign: 'center' },
                text({ weight: 'bold', inline: true }, row.name),
                row.isDefault && tag({ size: 'sm' }, 'default'),
              ),
          },
          {
            key: 'type',
            label: 'Type',
            sortable: true,
            render: (row) => tag({ color: typeOf(row).color, size: 'sm' }, typeOf(row).label),
          },
          { key: 'url', label: 'URL' },
          {
            key: 'status',
            label: 'Status',
            render: (row) =>
              tag(
                { color: STATUS[row.status].color, dot: true, size: 'sm' },
                STATUS[row.status].label,
              ),
          },
          {
            key: 'actions',
            label: 'Actions',
            align: 'end',
            render: (row) =>
              flex(
                { gap: 1, horizontalAlign: 'end' },
                button(
                  {
                    size: 'sm',
                    loading: computed(
                      [api.tracked(`test.${row.id}`).pending],
                      (count) => count > 0,
                    ),
                    events: { click: () => test(row) },
                  },
                  'Test',
                ),
                button(
                  {
                    size: 'sm',
                    variant: 'ghost',
                    square: true,
                    label: `Remove ${row.name}`,
                    events: { click: () => remove(row) },
                  },
                  icon(luTrash2),
                ),
              ),
          },
        ],
      }),
      dialog(
        { title: 'Add connector', open: adding },
        // Built again on every open, so the form starts empty each time.
        adding.view((open) =>
          open &&
          form(
            {
              initialValues: { name: '', type: 'prometheus', url: '', isDefault: false },
              onSubmit: create,
            },
            textField({ field: 'name', label: 'Name', required: true }),
            select({
              field: 'type',
              label: 'Type',
              options: TYPES.map(({ value, label }) => ({ value, label })),
            }),
            textField({
              field: 'url',
              type: 'url',
              label: 'URL',
              required: true,
              placeholder: 'http://prometheus:9090',
            }),
            toggle({ field: 'isDefault', label: 'Use as the default connector' }),
            flex(
              { horizontalAlign: 'end' },
              button({ events: { click: () => adding.set(false) } }, 'Cancel'),
              submitButton('Add connector'),
            ),
          )
        ),
      ),
    )
  },
})
