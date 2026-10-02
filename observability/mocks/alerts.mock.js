// Alert rules fire now and then. The app polls this endpoint and turns every
// new alert into a notification in the bell.

const RULES = [
  {
    severity: 'critical',
    title: 'High error rate',
    description: 'Error rate is above 3% for 5 minutes',
    dashboardId: 'api-overview',
  },
  {
    severity: 'warning',
    title: 'CPU above 80% on node-2',
    description: 'node-2 has been busy for 10 minutes',
    dashboardId: 'infrastructure',
  },
  {
    severity: 'warning',
    title: 'Orders dropped',
    description: 'Orders per minute are 40% below last week',
    dashboardId: 'business',
  },
]

const firing = []
let calls = 0

export const mocks = [
  {
    match: (request) => request.method === 'GET' && request.path === '/api/alerts',
    handler: () => {
      calls++
      // The second poll fires an alert, then every third poll fires another.
      if (calls % 3 === 2) {
        const rule = RULES[firing.length % RULES.length]
        firing.push({
          ...rule,
          id: `alert-${firing.length + 1}`,
          firedAt: new Date().toISOString(),
        })
      }
      return { body: firing }
    },
  },
]
