import { component } from 'imp'
import { lang, t } from 'imp/i18n'
import { luPlus, luTrash2 } from 'imp/icons'
import { useHttpClient } from 'imp/http'
import { computed, initState } from 'imp/state'
import { button, heading, icon, text } from 'imp/std'
import { table } from 'imp/std/data'
import { tag } from 'imp/std/display'
import { notify, skeleton } from 'imp/std/feedback'
import { form, select, textField, toggle } from 'imp/std/inputs'
import { dialog, flex, stack } from 'imp/std/layout'
import { message, say } from '../i18n.js'
import { submitButton } from '../submit-button.js'

// Product names, the same in every language.
const TYPES = [
  { value: 'prometheus', label: 'Prometheus', color: 'orange' },
  { value: 'loki', label: 'Loki', color: 'teal' },
  { value: 'postgres', label: 'PostgreSQL', color: 'blue' },
  { value: 'cloudwatch', label: 'CloudWatch', color: 'pink' },
]

// The labels are messages: connectors.status.<key>.
const STATUS_COLORS = { untested: 'gray', ok: 'green', failing: 'red' }

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
          title: t('connectors.working', { name: connector.name }),
          description: t('connectors.answered', { latency }),
          ttl: 0,
        })
      } catch (error) {
        setStatus(connector.id, 'failing')
        notify({
          kind: 'error',
          title: t('connectors.unreachable', { name: connector.name }),
          description: error.body?.message ?? error.message,
        })
      }
    }

    const remove = async (connector) => {
      await api.delete(`/connectors/${connector.id}`)
      await reload()
      notify({ kind: 'success', title: t('connectors.removed', { name: connector.name }), ttl: 0 })
    }

    const create = async (values) => {
      const connector = await api.post('/connectors', { body: values })
      await reload()
      adding.set(false)
      notify({ kind: 'success', title: t('connectors.added', { name: connector.name }), ttl: 0 })
    }

    // `lang` is a dependency so the rows, and the tags rendered in them, are
    // rendered again in a new language.
    const rows = computed([connectors, statuses, lang], (all, status) =>
      all.map((connector) => ({ ...connector, status: status[connector.id] ?? 'untested' })),
    )

    await reload()

    return stack(
      { gap: 4 },
      flex(
        { horizontalAlign: 'justify', verticalAlign: 'center' },
        stack(
          { gap: 1 },
          heading(say('connectors.title')),
          text({ tone: 'secondary' }, say('connectors.intro')),
        ),
        button(
          { variant: 'primary', events: { click: () => adding.set(true) } },
          icon(luPlus, { size: 'sm' }),
          say('connectors.add'),
        ),
      ),
      table({
        label: message('connectors.title'),
        rows,
        columns: [
          {
            key: 'name',
            label: message('connectors.columns.name'),
            sortable: true,
            render: (row) =>
              flex(
                { gap: 2, verticalAlign: 'center' },
                text({ weight: 'bold', inline: true }, row.name),
                row.isDefault && tag({ size: 'sm' }, t('connectors.default')),
              ),
          },
          {
            key: 'type',
            label: message('connectors.columns.type'),
            sortable: true,
            render: (row) => tag({ color: typeOf(row).color, size: 'sm' }, typeOf(row).label),
          },
          { key: 'url', label: message('connectors.columns.url') },
          {
            key: 'status',
            label: message('connectors.columns.status'),
            render: (row) =>
              tag(
                { color: STATUS_COLORS[row.status], dot: true, size: 'sm' },
                t(`connectors.status.${row.status}`),
              ),
          },
          {
            key: 'actions',
            label: message('connectors.columns.actions'),
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
                  t('connectors.test'),
                ),
                button(
                  {
                    size: 'sm',
                    variant: 'ghost',
                    square: true,
                    label: t('connectors.remove', { name: row.name }),
                    events: { click: () => remove(row) },
                  },
                  icon(luTrash2),
                ),
              ),
          },
        ],
      }),
      dialog(
        { title: message('connectors.add'), open: adding },
        // Built again on every open, so the form starts empty each time.
        adding.view(
          (open) =>
            open
            && form(
              {
                initialValues: { name: '', type: 'prometheus', url: '', isDefault: false },
                onSubmit: create,
              },
              textField({ field: 'name', label: message('connectors.name'), required: true }),
              select({
                field: 'type',
                label: message('connectors.type'),
                options: TYPES.map(({ value, label }) => ({ value, label })),
              }),
              textField({
                field: 'url',
                type: 'url',
                label: message('connectors.url'),
                required: true,
                placeholder: 'http://prometheus:9090',
              }),
              toggle({ field: 'isDefault', label: message('connectors.isDefault') }),
              flex(
                { horizontalAlign: 'end' },
                button({ events: { click: () => adding.set(false) } }, say('common.cancel')),
                submitButton(say('connectors.add')),
              ),
            ),
        ),
      ),
    )
  },
})
