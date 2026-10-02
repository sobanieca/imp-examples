import { component } from 'imp'
import { luArrowDown, luArrowUp, luPencil, luPlus, luSearch, luTrash2 } from 'imp/icons'
import { useHttpClient } from 'imp/http'
import { beforeLeave, navigate } from 'imp/router'
import { computed, initState, useState } from 'imp/state'
import { button, heading, icon, text } from 'imp/std'
import { list } from 'imp/std/data'
import { card, emptyState } from 'imp/std/display'
import { notify, skeleton } from 'imp/std/feedback'
import { comboBox, form, textField } from 'imp/std/inputs'
import { dialog, flex, stack } from 'imp/std/layout'
import { app } from '../app-map.js'
import { submitButton } from '../submit-button.js'
import { PANEL_TYPES, PANEL_WIDTHS } from './panel.js'
import { panelEditor } from './panel-editor.js'

const typeOf = (panel) => PANEL_TYPES.find((type) => type.value === panel.type)
const widthOf = (panel) => PANEL_WIDTHS.find((width) => width.value === panel.width)

const iconButton = (label, glyph, onClick) =>
  button(
    { variant: 'ghost', square: true, size: 'sm', label, events: { click: onClick } },
    icon(glyph),
  )

// Everything below lives inside the dashboard form. The panels are one more
// field of it, so a panel change makes the form dirty like a typed title does.
const dashboardForm = component('beacon-dashboard-form', {
  setup: (self, { id, connectors, tags, canLeave }) => {
    const values = useState(self, 'imp.form')
    const dirty = useState(self, 'imp.form.dirty')
    const editorOpen = initState(self, 'beacon.editor.open', false)
    const draft = initState(self, 'beacon.editor.draft', null)

    beforeLeave(self, () => canLeave() || !dirty.get() || confirm('Discard your unsaved changes?'))
    editorOpen.watch(self, (open) => open || draft.set(null))

    const setPanels = (change) =>
      values.set((dashboard) => ({ ...dashboard, panels: change(dashboard.panels) }))

    const openEditor = (panel) => {
      draft.set(panel)
      editorOpen.set(true)
    }

    const addPanel = () =>
      openEditor({
        id: `panel-${Date.now()}`,
        title: 'New panel',
        type: 'line',
        connectorId: connectors.find((connector) => connector.isDefault)?.id ?? connectors[0].id,
        metric: '',
        width: 'medium',
      })

    const applyPanel = (panel) => {
      setPanels((panels) =>
        panels.some((one) => one.id === panel.id)
          ? panels.map((one) => (one.id === panel.id ? panel : one))
          : [...panels, panel]
      )
      editorOpen.set(false)
    }

    const move = (panelId, step) =>
      setPanels((panels) => {
        const from = panels.findIndex((panel) => panel.id === panelId)
        const to = from + step
        if (to < 0 || to >= panels.length) return panels
        const next = [...panels]
        ;[next[from], next[to]] = [next[to], next[from]]
        return next
      })

    const removePanel = (panelId) =>
      setPanels((panels) => panels.filter((panel) => panel.id !== panelId))

    const items = computed([values], (dashboard) =>
      dashboard.panels.map((panel) => ({
        id: panel.id,
        title: panel.title,
        description: `${typeOf(panel).label} · ${panel.connectorId} · ${panel.metric}`,
        icon: typeOf(panel).icon,
        tag: { text: widthOf(panel).label, color: 'gray' },
      })))

    return stack(
      { gap: 4 },
      flex(
        { horizontalAlign: 'justify', verticalAlign: 'center', wrap: true },
        heading('Edit dashboard'),
        flex(
          button(
            {
              events: {
                click: () => navigate(app.dashboards.$dashboardId.href({ dashboardId: id })),
              },
            },
            'Cancel',
          ),
          submitButton('Save dashboard'),
        ),
      ),
      card(
        { header: text({ weight: 'bold' }, 'Settings') },
        stack(
          textField({ field: 'title', label: 'Title', required: true, maxLength: 60 }),
          textField({ field: 'description', label: 'Description', rows: 2 }),
          comboBox({ field: 'tags', label: 'Tags', multiple: true, custom: true, options: tags }),
        ),
      ),
      card(
        {
          header: flex(
            { horizontalAlign: 'justify', verticalAlign: 'center' },
            text({ weight: 'bold' }, 'Panels'),
            button(
              { size: 'sm', events: { click: addPanel } },
              icon(luPlus, { size: 'sm' }),
              'Add panel',
            ),
          ),
        },
        // The list follows every panel change in place; it is rebuilt only
        // when the dashboard gains its first panel or loses its last one.
        computed([items], (all) => all.length === 0).view((empty) =>
          empty
            ? emptyState({ title: 'No panels', description: 'Add a chart, a stat or a log table.' })
            : list({
              label: 'Panels',
              items,
              actions: (item) =>
                flex(
                  { gap: 1 },
                  iconButton(`Move ${item.title} up`, luArrowUp, () => move(item.id, -1)),
                  iconButton(`Move ${item.title} down`, luArrowDown, () => move(item.id, 1)),
                  iconButton(`Edit ${item.title}`, luPencil, () =>
                    openEditor(
                      values.get().panels.find((panel) => panel.id === item.id),
                    )),
                  iconButton(`Remove ${item.title}`, luTrash2, () => removePanel(item.id)),
                ),
            })
        ),
      ),
      dialog(
        { title: 'Panel', open: editorOpen },
        draft.view((panel) =>
          panel &&
          panelEditor({
            panel,
            connectors,
            onApply: applyPanel,
            onCancel: () => editorOpen.set(false),
          })
        ),
      ),
    )
  },
})

export const dashboardEdit = component('beacon-dashboard-edit', {
  styles: `:host { --imp-dialog-inline-size: 48rem; }`,
  loading: () => skeleton({ lines: 8 }),
  setup: async (self, { id }) => {
    const api = useHttpClient(self, 'beacon.api')
    const dashboards = useState(self, 'beacon.dashboards')
    const [dashboard, connectors] = await Promise.all([
      api.get(`/dashboards/${id}`),
      api.get('/connectors'),
    ])
    const tags = [...new Set((dashboards.get() ?? []).flatMap((one) => one.tags))]

    let saved = false
    const save = async (values) => {
      const updated = await api.put(`/dashboards/${id}`, { body: values })
      dashboards.set((all) => (all ?? []).map((one) => (one.id === id ? updated : one)))
      saved = true
      notify({ kind: 'success', title: 'Dashboard saved', ttl: 0 })
      navigate(app.dashboards.$dashboardId.href({ dashboardId: id }))
    }

    return form(
      { initialValues: dashboard, onSubmit: save },
      dashboardForm({ id, connectors, tags, canLeave: () => saved }),
    )
  },
  error: () => emptyState({ icon: luSearch, kind: 'error', title: 'Dashboard not found' }),
})
