import { dashboards, uniqueId } from './db.js'

const idOf = (path) => path.split('/')[3]
const find = (path) => dashboards.find((dashboard) => dashboard.id === idOf(path))
const notFound = { status: 404, body: { message: 'No such dashboard' } }
const isOne = (path) => /^\/api\/dashboards\/[^/]+$/.test(path)

export const mocks = [
  {
    match: (request) => request.method === 'GET' && request.path === '/api/dashboards',
    delay: 300,
    handler: () => ({ body: dashboards }),
  },
  {
    match: (request) => request.method === 'POST' && request.path === '/api/dashboards',
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
    match: (request) => request.method === 'GET' && isOne(request.path),
    delay: 300,
    handler: ({ path }) => (find(path) ? { body: find(path) } : notFound),
  },
  {
    match: (request) => request.method === 'PUT' && isOne(request.path),
    delay: 600,
    handler: ({ path, body }) => {
      const dashboard = find(path)
      if (!dashboard) return notFound
      Object.assign(dashboard, body, { id: dashboard.id })
      return { body: dashboard }
    },
  },
  {
    match: (request) => request.method === 'DELETE' && isOne(request.path),
    handler: ({ path }) => {
      const index = dashboards.indexOf(find(path))
      if (index === -1) return notFound
      dashboards.splice(index, 1)
      return { status: 204 }
    },
  },
]
