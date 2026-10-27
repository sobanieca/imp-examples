import { connectors, metrics, uniqueId } from './db.js'

const find = (id) => connectors.find((connector) => connector.id === id)
const notFound = { status: 404, body: { message: 'No such connector' } }

export const routes = [
  {
    route: 'GET /connectors',
    delay: 300,
    handler: () => ({ body: connectors }),
  },
  {
    route: 'POST /connectors',
    delay: 500,
    handler: ({ body }) => {
      const connector = { ...body, id: uniqueId(connectors, body.name) }
      if (connector.isDefault) connectors.forEach((other) => (other.isDefault = false))
      connectors.push(connector)
      return { status: 201, body: connector }
    },
  },
  {
    route: 'DELETE /connectors/:id',
    handler: ({ params }) => {
      const index = connectors.indexOf(find(params.id))
      if (index === -1) return notFound
      connectors.splice(index, 1)
      return { status: 204 }
    },
  },
  {
    // Testing a connection: CloudWatch is down, everything else answers.
    route: 'POST /connectors/:id/test',
    delay: 900,
    handler: ({ params }) => {
      const connector = find(params.id)
      if (!connector) return notFound
      if (connector.type === 'cloudwatch') {
        return { status: 502, body: { message: `${connector.name}: connection refused` } }
      }
      return { body: { latency: 20 + Math.round(Math.random() * 80) } }
    },
  },
  {
    route: 'GET /connectors/:id/metrics',
    delay: 200,
    handler: ({ params }) => {
      const connector = find(params.id)
      if (!connector) return notFound
      return { body: Object.keys(metrics[connector.type] ?? {}) }
    },
  },
]
