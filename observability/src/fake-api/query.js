import { connectors, metrics } from './db.js'

const POINTS = 30
const MINUTES = { '15m': 15, '1h': 60, '6h': 360, '24h': 1440 }

// A wavy line around `base`, a little different for every series and every call.
const values = (base, max, seed) =>
  Array.from({ length: POINTS }, (_, i) => {
    const wave = 1 + 0.25 * Math.sin(i / 4 + seed) + 0.15 * (Math.random() - 0.5)
    const value = base * wave * (1 + seed * 0.15)
    return Number(Math.min(value, max ?? Infinity).toFixed(2))
  })

const LEVELS = ['info', 'info', 'info', 'warn', 'error']
const MESSAGES = [
  'GET /api/orders 200',
  'POST /api/checkout 201',
  'payment provider answered slowly',
  'cache miss for product catalog',
  'retrying connection to orders-db',
  'user signed in',
]

const logs = () =>
  Array.from({ length: 12 }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    time: Date.now() - i * 37_000,
    level: LEVELS[Math.floor(Math.random() * LEVELS.length)],
    service: ['api', 'web', 'worker'][i % 3],
    message: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
  }))

export const routes = [
  {
    route: 'GET /query',
    delay: 400,
    handler: ({ query }) => {
      const connector = connectors.find((item) => item.id === query.connectorId)
      if (!connector) return { status: 404, body: { message: 'Unknown connector' } }
      if (connector.type === 'cloudwatch') {
        return { status: 502, body: { message: `${connector.name} is not reachable` } }
      }
      const metric = metrics[connector.type]?.[query.metric]
      if (!metric) return { status: 400, body: { message: `Unknown metric ${query.metric}` } }
      if (metric.logs) return { body: { logs: logs() } }

      const step = ((MINUTES[query.range] ?? 60) * 60_000) / POINTS
      const now = Date.now()
      return {
        body: {
          unit: metric.unit,
          max: metric.max,
          // Timestamps in milliseconds. The app formats them in the reader's language.
          times: Array.from({ length: POINTS }, (_, i) => now - (POINTS - i) * step),
          series: metric.series.map((name, i) => ({
            name,
            values: values(metric.base, metric.max, i),
          })),
        },
      }
    },
  },
]
