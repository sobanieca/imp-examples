import { appMap } from 'imp'

export const app = appMap({
  home: {},
  signIn: 'Sign in to Beacon',
  dashboards: {
    description: 'Every dashboard of the team',
    $dashboardId: {
      description: 'Live panels of one dashboard',
      edit: 'Change the title, the tags and the panels of a dashboard',
    },
  },
  connectors: 'The data sources that panels query',
})
