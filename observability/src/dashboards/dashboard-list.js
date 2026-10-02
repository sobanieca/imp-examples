import { component } from 'imp'
import { luLayoutDashboard, luPencil, luPlus, luTrash2 } from 'imp/icons'
import { useHttpClient } from 'imp/http'
import { navigate } from 'imp/router'
import { computed, initState, useState } from 'imp/state'
import { button, heading, icon, menuButton } from 'imp/std'
import { list } from 'imp/std/data'
import { emptyState } from 'imp/std/display'
import { notify, skeleton } from 'imp/std/feedback'
import { textField } from 'imp/std/inputs'
import { flex, stack } from 'imp/std/layout'
import { app } from '../app-map.js'

const editHref = (dashboardId) => app.dashboards.$dashboardId.edit.href({ dashboardId })

const matches = (dashboard, search) =>
  [dashboard.title, ...dashboard.tags].some((word) =>
    word.toLowerCase().includes(search.trim().toLowerCase())
  )

export const dashboardList = component('beacon-dashboard-list', {
  setup: (self) => {
    const api = useHttpClient(self, 'beacon.api')
    const dashboards = useState(self, 'beacon.dashboards')
    const search = initState(self, 'beacon.dashboards.search', '')

    api.get('/dashboards').then(dashboards.set)

    const items = computed(
      [dashboards, search],
      (all, text) =>
        (all ?? []).filter((dashboard) => matches(dashboard, text)).map((dashboard) => ({
          id: dashboard.id,
          title: dashboard.title,
          description: dashboard.description,
          icon: luLayoutDashboard,
          tag: { text: `${dashboard.panels.length} panels`, color: 'blue' },
          href: app.dashboards.$dashboardId.href({ dashboardId: dashboard.id }),
        })),
    )

    const create = async () => {
      const dashboard = await api.post('/dashboards', { body: { title: 'New dashboard' } })
      dashboards.set((all) => [...all, dashboard])
      navigate(editHref(dashboard.id))
    }

    // A notification with actions doubles as a confirmation: await the choice.
    const remove = async (item) => {
      const choice = await notify({
        kind: 'warning',
        title: `Delete "${item.title}"?`,
        description: 'Its panels are deleted with it.',
        actions: [{ id: 'delete', label: 'Delete', variant: 'danger' }, {
          id: 'keep',
          label: 'Keep',
        }],
        duration: 0,
        ttl: 0,
      })
      if (choice !== 'delete') return
      await api.delete(`/dashboards/${item.id}`)
      dashboards.set((all) => all.filter((dashboard) => dashboard.id !== item.id))
      notify({ kind: 'success', title: `"${item.title}" deleted`, ttl: 0 })
    }

    return stack(
      { gap: 4 },
      flex(
        { horizontalAlign: 'justify', verticalAlign: 'center' },
        heading('Dashboards'),
        button(
          { variant: 'primary', events: { click: create } },
          icon(luPlus, { size: 'sm' }),
          'New dashboard',
        ),
      ),
      textField({
        value: search,
        type: 'search',
        ariaLabel: 'Search dashboards',
        placeholder: 'Search by title or tag',
      }),
      // `undefined` means not loaded yet: show a skeleton, not "empty".
      computed([dashboards, items], (all, shown) => {
        if (all === undefined) return 'loading'
        return shown.length === 0 ? 'empty' : 'ready'
      }).view((status) => {
        if (status === 'loading') return skeleton({ lines: 6 })
        if (status === 'empty') {
          return emptyState({ variant: 'noResults', description: 'Try another search.' })
        }
        return list({
          label: 'Dashboards',
          items,
          actions: (item) =>
            menuButton({
              variant: 'ghost',
              label: `Actions for ${item.title}`,
              items: [
                {
                  id: 'edit',
                  label: 'Edit',
                  icon: luPencil,
                  onClick: () => navigate(editHref(item.id)),
                },
                { id: 'delete', label: 'Delete', icon: luTrash2, onClick: () => remove(item) },
              ],
            }),
        })
      }),
    )
  },
})
