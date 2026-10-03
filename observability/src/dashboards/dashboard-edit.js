import { component } from 'imp'
import { lang, t } from 'imp/i18n'
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
import { message, say } from '../i18n.js'
import { submitButton } from '../submit-button.js'
import { PANEL_TYPES, typeLabel, widthLabel } from './panel.js'
import { panelEditor } from './panel-editor.js'

const typeOf = (panel) => PANEL_TYPES.find((type) => type.value === panel.type)

// `label` is a message key; the button's name follows the language.
const iconButton = (label, title, glyph, onClick) =>
  button(
    {
      variant: 'ghost',
      square: true,
      size: 'sm',
      label: message(label, { title }),
      events: { click: onClick },
    },
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

    beforeLeave(self, () => canLeave() || !dirty.get() || confirm(t('editor.discard')))
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
        title: t('editor.newPanel'),
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

    const items = computed([values, lang], (dashboard) =>
      dashboard.panels.map((panel) => ({
        id: panel.id,
        title: panel.title,
        description: `${typeLabel(panel.type)} · ${panel.connectorId} · ${panel.metric}`,
        icon: typeOf(panel).icon,
        tag: { text: widthLabel(panel.width), color: 'gray' },
      })))

    return stack(
      { gap: 4 },
      flex(
        { horizontalAlign: 'justify', verticalAlign: 'center', wrap: true },
        heading(say('editor.title')),
        flex(
          button(
            {
              events: {
                click: () => navigate(app.dashboards.$dashboardId.href({ dashboardId: id })),
              },
            },
            say('common.cancel'),
          ),
          submitButton(say('editor.save')),
        ),
      ),
      card(
        { header: text({ weight: 'bold' }, say('editor.settings')) },
        stack(
          textField({
            field: 'title',
            label: message('editor.fieldTitle'),
            required: true,
            maxLength: 60,
          }),
          textField({ field: 'description', label: message('editor.description'), rows: 2 }),
          comboBox({
            field: 'tags',
            label: message('editor.tags'),
            multiple: true,
            custom: true,
            options: tags,
          }),
        ),
      ),
      card(
        {
          header: flex(
            { horizontalAlign: 'justify', verticalAlign: 'center' },
            text({ weight: 'bold' }, say('editor.panels')),
            button(
              { size: 'sm', events: { click: addPanel } },
              icon(luPlus, { size: 'sm' }),
              say('editor.addPanel'),
            ),
          ),
        },
        // The list follows every panel change in place; it is rebuilt only
        // when the dashboard gains its first panel or loses its last one.
        computed([items], (all) => all.length === 0).view((empty) =>
          empty
            ? emptyState({
              title: message('editor.noPanels'),
              description: message('editor.noPanelsDescription'),
            })
            : list({
              label: message('editor.panels'),
              items,
              actions: (item) =>
                flex(
                  { gap: 1 },
                  iconButton('editor.moveUp', item.title, luArrowUp, () => move(item.id, -1)),
                  iconButton('editor.moveDown', item.title, luArrowDown, () => move(item.id, 1)),
                  iconButton('editor.editPanel', item.title, luPencil, () =>
                    openEditor(
                      values.get().panels.find((panel) => panel.id === item.id),
                    )),
                  iconButton(
                    'editor.removePanel',
                    item.title,
                    luTrash2,
                    () => removePanel(item.id),
                  ),
                ),
            })
        ),
      ),
      dialog(
        { title: message('editor.panel'), open: editorOpen },
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
      notify({ kind: 'success', title: t('editor.saved'), ttl: 0 })
      navigate(app.dashboards.$dashboardId.href({ dashboardId: id }))
    }

    return form(
      { initialValues: dashboard, onSubmit: save },
      dashboardForm({ id, connectors, tags, canLeave: () => saved }),
    )
  },
  error: () => emptyState({ icon: luSearch, kind: 'error', title: message('dashboard.notFound') }),
})
