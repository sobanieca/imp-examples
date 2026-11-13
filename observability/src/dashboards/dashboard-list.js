import { component } from 'imp'
import { lang, t } from 'imp/i18n'
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
import { message, plural, say } from '../i18n.js'

const editHref = (dashboardId) => app.dashboards.$dashboardId.edit.href({ dashboardId })

const matches = (dashboard, search) =>
  [dashboard.title, ...dashboard.tags].some((word) =>
    word.toLowerCase().includes(search.trim().toLowerCase()),
  )

export const dashboardList = component('beacon-dashboard-list', {
  setup: (self) => {
    const api = useHttpClient(self, 'beacon.api')
    const dashboards = useState(self, 'beacon.dashboards')
    const search = initState(self, 'beacon.dashboards.search', '')

    api.get('/dashboards').then(dashboards.set)

    // `lang` is a dependency too: the panel count tag is text in the current language.
    const items = computed([dashboards, search, lang], (all, text) =>
      (all ?? [])
        .filter((dashboard) => matches(dashboard, text))
        .map((dashboard) => ({
          id: dashboard.id,
          title: dashboard.title,
          description: dashboard.description,
          icon: luLayoutDashboard,
          tag: { text: plural('dashboards.panels', dashboard.panels.length), color: 'blue' },
          href: app.dashboards.$dashboardId.href({ dashboardId: dashboard.id }),
        })),
    )

    const create = async () => {
      const dashboard = await api.post('/dashboards', { body: { title: t('dashboards.newTitle') } })
      dashboards.set((all) => [...all, dashboard])
      navigate(editHref(dashboard.id))
    }

    // A notification with actions doubles as a confirmation: await the choice.
    const remove = async (item) => {
      const choice = await notify({
        kind: 'warning',
        title: t('dashboards.confirmDelete', { title: item.title }),
        description: t('dashboards.confirmDeleteDescription'),
        actions: [
          { id: 'delete', label: t('common.delete'), variant: 'danger' },
          {
            id: 'keep',
            label: t('dashboards.keep'),
          },
        ],
        duration: 0,
        ttl: 0,
      })
      if (choice !== 'delete') return
      await api.delete(`/dashboards/${item.id}`)
      dashboards.set((all) => all.filter((dashboard) => dashboard.id !== item.id))
      notify({ kind: 'success', title: t('dashboards.deleted', { title: item.title }), ttl: 0 })
    }

    return stack(
      { gap: 4 },
      flex(
        { horizontalAlign: 'justify', verticalAlign: 'center' },
        heading(say('dashboards.title')),
        button(
          { variant: 'primary', events: { click: create } },
          icon(luPlus, { size: 'sm' }),
          say('dashboards.create'),
        ),
      ),
      // ariaLabel and placeholder are plain strings: the field is built again
      // on a language switch, and keeps the search, which lives in a state.
      lang.view(() =>
        textField({
          value: search,
          type: 'search',
          ariaLabel: t('dashboards.search'),
          placeholder: t('dashboards.searchPlaceholder'),
        }),
      ),
      // `undefined` means not loaded yet: show a skeleton, not "empty".
      computed([dashboards, items], (all, shown) => {
        if (all === undefined) return 'loading'
        return shown.length === 0 ? 'empty' : 'ready'
      }).view((status) => {
        if (status === 'loading') return skeleton({ lines: 6 })
        if (status === 'empty') {
          return emptyState({ variant: 'noResults', description: message('dashboards.noMatch') })
        }
        return list({
          label: message('dashboards.title'),
          items,
          actions: (item) =>
            menuButton({
              variant: 'ghost',
              label: message('dashboards.actions', { title: item.title }),
              items: [
                {
                  id: 'edit',
                  label: message('common.edit'),
                  icon: luPencil,
                  onClick: () => navigate(editHref(item.id)),
                },
                {
                  id: 'delete',
                  label: message('common.delete'),
                  icon: luTrash2,
                  onClick: () => remove(item),
                },
              ],
            }),
        })
      }),
    )
  },
})
