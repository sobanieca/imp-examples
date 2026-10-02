import { appMap } from 'imp'

export const app = appMap({
  home: { path: '/', nav: false },
  signIn: { nav: false, description: 'Sign in to Beacon' },
  dashboards: {
    description: 'Every dashboard of the team',
    access: 'user',
    $dashboardId: {
      description: 'Live panels of one dashboard',
      edit: { nav: false, description: 'Change the title, the tags and the panels of a dashboard' },
    },
  },
  connectors: { description: 'The data sources that panels query', access: 'user' },
})
