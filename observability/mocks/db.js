// The in-memory backend behind the mocks. imp loads the mock files once per
// run, so these arrays remember every change until you restart `imp start`.

export const connectors = [
  {
    id: 'prometheus',
    name: 'Prometheus',
    type: 'prometheus',
    url: 'http://prometheus:9090',
    isDefault: true,
  },
  { id: 'loki', name: 'Loki', type: 'loki', url: 'http://loki:3100', isDefault: false },
  {
    id: 'orders-db',
    name: 'Orders DB',
    type: 'postgres',
    url: 'postgres://orders-db:5432/orders',
    isDefault: false,
  },
  {
    id: 'cloudwatch',
    name: 'CloudWatch eu-west-1',
    type: 'cloudwatch',
    url: 'https://monitoring.eu-west-1.amazonaws.com',
    isDefault: false,
  },
]

// What each connector type can be asked for. `series` names the lines of a metric.
export const metrics = {
  prometheus: {
    http_requests: { unit: 'req/s', base: 420, series: ['GET', 'POST', 'DELETE'] },
    http_latency_p95: { unit: 'ms', base: 180, series: ['api', 'web'] },
    error_rate: { unit: '%', base: 1.4, max: 5, series: ['all'] },
    cpu_usage: { unit: '%', base: 55, max: 100, series: ['node-1', 'node-2', 'node-3'] },
    memory_usage: { unit: '%', base: 68, max: 100, series: ['node-1', 'node-2', 'node-3'] },
  },
  postgres: {
    orders_per_minute: { unit: 'orders', base: 38, series: ['web', 'mobile'] },
    revenue: { unit: 'EUR', base: 2400, series: ['EU', 'US', 'APAC'] },
    active_connections: { unit: 'conn', base: 42, max: 100, series: ['primary'] },
  },
  loki: {
    app_logs: { logs: true },
  },
  cloudwatch: {
    lambda_invocations: { unit: 'calls', base: 900, series: ['checkout', 'emails'] },
  },
}

const panel = (id, title, type, connectorId, metric, width) => ({
  id,
  title,
  type,
  connectorId,
  metric,
  width,
})

export const dashboards = [
  {
    id: 'api-overview',
    title: 'API overview',
    description: 'Traffic, latency and errors of the public API',
    tags: ['api', 'production'],
    panels: [
      panel('p1', 'Error rate', 'stat', 'prometheus', 'error_rate', 'small'),
      panel('p2', 'CPU', 'stat', 'prometheus', 'cpu_usage', 'small'),
      panel('p3', 'DB connections', 'stat', 'orders-db', 'active_connections', 'small'),
      panel('p4', 'Requests per second', 'line', 'prometheus', 'http_requests', 'full'),
      panel('p5', 'Latency p95 per app', 'column', 'prometheus', 'http_latency_p95', 'medium'),
      panel('p6', 'CPU per node', 'table', 'prometheus', 'cpu_usage', 'small'),
      panel('p7', 'Application logs', 'logs', 'loki', 'app_logs', 'full'),
    ],
  },
  {
    id: 'business',
    title: 'Business KPIs',
    description: 'Orders and revenue, straight from the orders database',
    tags: ['sales'],
    panels: [
      panel('p1', 'Orders per minute', 'line', 'orders-db', 'orders_per_minute', 'medium'),
      panel('p2', 'Connections', 'stat', 'orders-db', 'active_connections', 'small'),
      panel('p3', 'Revenue per region', 'column', 'orders-db', 'revenue', 'full'),
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    description: 'Nodes, memory and serverless functions',
    tags: ['infra', 'production'],
    panels: [
      panel('p1', 'CPU', 'line', 'prometheus', 'cpu_usage', 'medium'),
      panel('p2', 'Memory', 'stat', 'prometheus', 'memory_usage', 'small'),
      panel('p3', 'Memory per node', 'bar', 'prometheus', 'memory_usage', 'medium'),
      panel('p4', 'Lambda invocations', 'column', 'cloudwatch', 'lambda_invocations', 'small'),
    ],
  },
]

const slug = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'

export const uniqueId = (list, text) => {
  const base = slug(text)
  let id = base
  for (let n = 2; list.some((item) => item.id === id); n++) id = `${base}-${n}`
  return id
}
