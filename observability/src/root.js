import { component } from 'imp'
import { lang } from 'imp/i18n'
import { luActivity, luLayoutDashboard, luLogOut, luPlug } from 'imp/icons'
import { initHttpClient } from 'imp/http'
import { redirect, router, wait } from 'imp/router'
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

// The guard of the root covers every node: the sign-in page is open, the rest
// waits for the session, then lets the user in or sends them to sign in.
const signedIn = {
  states: ['beacon.session'],
  check: (session, { node, path }) => {
    if (node === app.signIn) return true
    if (session === undefined) return wait
    return Boolean(session) || `${app.signIn.href()}?next=${encodeURIComponent(path)}`
  },
}

export const root = component('beacon-root', {
  setup: (self) => {
    const session = initState(self, 'beacon.session')
    const dashboards = initState(self, 'beacon.dashboards')

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
        map: app,
        nav: {
          [app.signIn]: { hidden: true },
          [app.dashboards]: { icon: luLayoutDashboard },
          [app.dashboards.$dashboardId.edit]: { hidden: true },
          [app.connectors]: { icon: luPlug },
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
        guards: { [app]: signedIn },
        screens: {
          [app]: redirect(app.dashboards),
          [app.signIn]: () => signInPage(),
          [app.dashboards]: () => dashboardList(),
          [app.dashboards.$dashboardId]: ({ params }) => dashboardView({ id: params.dashboardId }),
          [app.dashboards.$dashboardId.edit]: ({ params }) =>
            dashboardEdit({ id: params.dashboardId }),
          [app.connectors]: () => connectorList(),
        },
        title: ({ crumbs }) => `${crumbs.at(-1)} - Beacon`,
        notFound: () => emptyState({ variant: 'noResults', title: message('shell.notFound') }),
      }),
    )
  },
})
