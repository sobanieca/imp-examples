import { component } from 'imp'
import { lang, t } from 'imp/i18n'
import { div } from 'imp/html'
import { useHttpClient } from 'imp/http'
import { computed, initState, useState } from 'imp/state'
import { button } from 'imp/std'
import { skeleton } from 'imp/std/feedback'
import { form, segmented, select, textField } from 'imp/std/inputs'
import { flex } from 'imp/std/layout'
import { message, say } from '../i18n.js'
import { submitButton } from '../submit-button.js'
import { PANEL_TYPES, PANEL_WIDTHS, panelView, typeLabel, widthLabel } from './panel.js'

// The metrics depend on the connector, so this field loads them itself. When
// the connector changes, the field mounts again and picks a valid metric.
const metricField = component('beacon-metric-field', {
  loading: () => skeleton({ lines: 1 }),
  setup: async (self, { connectorId }) => {
    const api = useHttpClient(self, 'beacon.api')
    const values = useState(self, 'imp.form')
    const metrics = await api.get(`/connectors/${connectorId}/metrics`)
    if (!metrics.includes(values.get().metric)) {
      values.set((panel) => ({ ...panel, metric: metrics[0] }))
    }
    return select({
      field: 'metric',
      label: message('panelEditor.metric'),
      options: metrics,
      required: true,
    })
  },
})

const panelFields = component('beacon-panel-fields', {
  styles: `
    .fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: var(--imp-space-3);
      margin-block-end: var(--imp-space-4);
    }
    .preview { margin-block-end: var(--imp-space-4); }
  `,
  setup: (self, { connectors, onCancel }) => {
    const values = useState(self, 'imp.form')
    const previewQuery = initState(self, 'beacon.preview.query', { range: '1h', tick: 0 })

    // The preview runs again only when the query itself changes, not on every
    // keystroke in the title.
    const source = computed([values], ({ type, connectorId, metric }) => ({
      type,
      connectorId,
      metric,
    }))

    return div(
      div(
        { class: 'fields' },
        textField({ field: 'title', label: message('panelEditor.title'), required: true }),
        select({
          field: 'connectorId',
          label: message('panelEditor.connector'),
          options: connectors.map((connector) => ({ value: connector.id, label: connector.name })),
        }),
        computed([values], (panel) => panel.connectorId).view((connectorId) =>
          metricField({ connectorId }),
        ),
        // Options are read once: a language switch builds these two again.
        // The value is the form's, so nothing is lost.
        lang.view(() =>
          segmented({
            field: 'width',
            label: t('panelEditor.width'),
            options: PANEL_WIDTHS.map((value) => ({ value, label: widthLabel(value) })),
          }),
        ),
      ),
      div(
        { class: 'fields' },
        lang.view(() =>
          segmented({
            field: 'type',
            label: t('panelEditor.visualization'),
            options: PANEL_TYPES.map(({ value }) => ({ value, label: typeLabel(value) })),
          }),
        ),
      ),
      div(
        { class: 'preview' },
        source.view(
          (panel) =>
            panel.metric
            && panelView({ panel: { ...panel, title: t('panel.preview') }, query: previewQuery }),
        ),
      ),
      flex(
        { horizontalAlign: 'end' },
        button({ events: { click: onCancel } }, say('common.cancel')),
        submitButton(say('panelEditor.apply')),
      ),
    )
  },
})

// A form of its own inside the dashboard form: it shadows `imp.form` for its fields.
export const panelEditor = component('beacon-panel-editor', {
  setup: (_self, { panel, connectors, onApply, onCancel }) =>
    form({ initialValues: panel, onSubmit: onApply }, panelFields({ connectors, onCancel })),
})
