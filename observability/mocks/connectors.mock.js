import { connectors, metrics, uniqueId } from './db.js'

const idOf = (path) => path.split('/')[3]
const find = (path) => connectors.find((connector) => connector.id === idOf(path))
const notFound = { status: 404, body: { message: 'No such connector' } }

export const mocks = [
  {
    match: (request) => request.method === 'GET' && request.path === '/api/connectors',
    delay: 300,
    handler: () => ({ body: connectors }),
  },
  {
    match: (request) => request.method === 'POST' && request.path === '/api/connectors',
    delay: 500,
    handler: ({ body }) => {
      const connector = { ...body, id: uniqueId(connectors, body.name) }
      if (connector.isDefault) connectors.forEach((other) => (other.isDefault = false))
      connectors.push(connector)
      return { status: 201, body: connector }
    },
  },
  {
    match: (request) =>
      request.method === 'DELETE' && /^\/api\/connectors\/[^/]+$/.test(request.path),
    handler: ({ path }) => {
      const index = connectors.indexOf(find(path))
      if (index === -1) return notFound
      connectors.splice(index, 1)
      return { status: 204 }
    },
  },
  {
    // Testing a connection: CloudWatch is down, everything else answers.
    match: (request) => request.method === 'POST' && request.path.endsWith('/test'),
    delay: 900,
    handler: ({ path }) => {
      const connector = find(path)
      if (!connector) return notFound
      if (connector.type === 'cloudwatch') {
        return { status: 502, body: { message: `${connector.name}: connection refused` } }
      }
      return { body: { latency: 20 + Math.round(Math.random() * 80) } }
    },
  },
  {
    match: (request) => request.method === 'GET' && request.path.endsWith('/metrics'),
    delay: 200,
    handler: ({ path }) => {
      const connector = find(path)
      if (!connector) return notFound
      return { body: Object.keys(metrics[connector.type] ?? {}) }
    },
  },
]
