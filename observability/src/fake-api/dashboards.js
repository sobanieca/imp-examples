import { dashboards, uniqueId } from './db.js'

const find = (id) => dashboards.find((dashboard) => dashboard.id === id)
const notFound = { status: 404, body: { message: 'No such dashboard' } }

export const routes = [
  {
    route: 'GET /dashboards',
    delay: 300,
    handler: () => ({ body: dashboards }),
  },
  {
    route: 'POST /dashboards',
    delay: 300,
    handler: ({ body }) => {
      const dashboard = {
        id: uniqueId(dashboards, body.title),
        title: body.title,
        description: '',
        tags: [],
        panels: [],
      }
      dashboards.push(dashboard)
      return { status: 201, body: dashboard }
    },
  },
  {
    route: 'GET /dashboards/:id',
    delay: 300,
    handler: ({ params }) => (find(params.id) ? { body: find(params.id) } : notFound),
  },
  {
    route: 'PUT /dashboards/:id',
    delay: 600,
    handler: ({ params, body }) => {
      const dashboard = find(params.id)
      if (!dashboard) return notFound
      Object.assign(dashboard, body, { id: dashboard.id })
      return { body: dashboard }
    },
  },
  {
    route: 'DELETE /dashboards/:id',
    handler: ({ params }) => {
      const index = dashboards.indexOf(find(params.id))
      if (index === -1) return notFound
      dashboards.splice(index, 1)
      return { status: 204 }
    },
  },
]
