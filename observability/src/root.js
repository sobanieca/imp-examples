import { component } from 'imp'
import { lang } from 'imp/i18n'
import { luActivity, luLayoutDashboard, luLogOut, luPlug } from 'imp/icons'
import { initHttpClient } from 'imp/http'
import { guard, redirect, router, wait } from 'imp/router'
import { initState } from 'imp/state'
import { icon, menuButton } from 'imp/std'
import { emptyState } from 'imp/std/display'
import { toast } from 'imp/std/feedback'
import { appLogo, langSelect, notifications, shell, themeSelect } from 'imp/std/shell'
import { alertFeed } from './alert-feed.js'
import { app } from './app-map.js'
import { connectorList } from './connectors/connector-list.js'
import { dashboardEdit } from './dashboards/dashboard-edit.js'
import { dashboardList } from './dashboards/dashboard-list.js'
import { dashboardView } from './dashboards/dashboard-view.js'
import { LANGUAGES, message, writeLang } from './i18n.js'
import { signInPage } from './sign-in.js'
import { themeChoices } from './theme.js'
import { readToken, writeToken } from './token.js'

// One guard for every node with `access` in the map: wait for the session,
// then let the user in or send them to the sign-in page.
const access = guard(['beacon.session'], (session, { path }) => {
  if (session === undefined) return wait
  return Boolean(session) || `${app.signIn.href()}?next=${encodeURIComponent(path)}`
})

export const root = component('beacon-root', {
  setup: (self) => {
    const session = initState(self, 'beacon.session')
    const dashboards = initState(self, 'beacon.dashboards')
    const dashboardOptions = initState(self, 'beacon.dashboardOptions', [])

    const api = initHttpClient(self, 'beacon.api', {
      baseUrl: '/api',
      onRequest: (request) => {
        const token = readToken()
        if (token) request.headers.authorization = `Bearer ${token}`
        return request
      },
    })

    api.get('/session').then(session.set, () => {
      api.clearError()
      session.set(null)
    })
    session.watch(self, (user) => user && api.get('/dashboards').then(dashboards.set))
    // The crumb of a dashboard gets a picker to jump to any other dashboard.
    dashboards.watch(
      self,
      (list) =>
        dashboardOptions.set(
          (list ?? []).map((dashboard) => ({ value: dashboard.id, label: dashboard.title })),
        ),
    )

    lang.watch(self, writeLang)

    const signOut = () => {
      writeToken(null)
      session.set(null)
    }

    return shell(
      {
        logo: appLogo({
          label: 'Beacon',
          tagline: message('shell.tagline'),
          icon: icon(luActivity, { size: 'lg', color: 'primary' }),
        }),
        navbar: {
          map: app,
          icons: { [app.dashboards]: luLayoutDashboard, [app.connectors]: luPlug },
        },
        extras: [
          notifications({ variant: 'ghost' }),
          langSelect({ languages: LANGUAGES, variant: 'ghost', remember: false }),
          // The labels of the theme choices are plain strings, so the picker is
          // built again in the new language.
          lang.view(() => themeSelect({ themes: themeChoices(), variant: 'ghost' })),
          menuButton(
            {
              variant: 'ghost',
              trigger: 'arrow',
              items: [
                {
                  id: 'sign-out',
                  label: message('shell.signOut'),
                  icon: luLogOut,
                  onClick: signOut,
                },
              ],
            },
            session.text((user) => user?.name ?? ''),
          ),
        ],
        signIn: app.signIn,
      },
      toast(),
      session.view((user) => user && alertFeed()),
      router({
        map: app,
        access,
        screens: {
          [app.home]: redirect(app.dashboards),
          [app.signIn]: () => signInPage(),
          [app.dashboards]: () => dashboardList(),
          [app.dashboards.$dashboardId]: ({ params }) => dashboardView({ id: params.dashboardId }),
          [app.dashboards.$dashboardId.edit]: ({ params }) =>
            dashboardEdit({ id: params.dashboardId }),
          [app.connectors]: () => connectorList(),
        },
        options: { [app.dashboards.$dashboardId]: 'beacon.dashboardOptions' },
        title: ({ crumbs }) => `${crumbs.at(-1)} - Beacon`,
        notFound: () => emptyState({ variant: 'noResults', title: message('shell.notFound') }),
      }),
    )
  },
})
