import { routes as alerts } from './alerts.js'
import { routes as connectors } from './connectors.js'
import { routes as dashboards } from './dashboards.js'
import { routes as query } from './query.js'
import { routes as session } from './session.js'

// Beacon has no backend. This fake answers its API inside the page, so the
// same build runs under `imp start`, in the e2e spec and on a static host such
// as GitHub Pages. It takes over `fetch` for paths under /api and lets every
// other request through. To use a real backend, drop installFakeApi() from
// src/main.js.

const ROUTES = [...session, ...dashboards, ...connectors, ...query, ...alerts]

// 'GET /dashboards/:id' -> { method, pattern }, where :id captures one segment.
const compile = ({ route, ...rest }) => {
  const [method, path] = route.split(' ')
  const names = []
  const source = path.replace(/:(\w+)/g, (_, name) => {
    names.push(name)
    return '([^/]+)'
  })
  return { ...rest, method, names, pattern: new RegExp(`^${source}/?$`) }
}

const compiled = ROUTES.map(compile)

const resolve = (method, path) => {
  for (const route of compiled) {
    const match = route.method === method && route.pattern.exec(path)
    if (match) {
      const params = Object.fromEntries(
        route.names.map((name, i) => [name, decodeURIComponent(match[i + 1])]),
      )
      return { route, params }
    }
  }
  return null
}

const json = (status, body) =>
  status === 204 || body === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })

// Waits like a network would, and gives up as fetch does when the call is aborted.
const latency = (ms, signal) =>
  new Promise((done, fail) => {
    const aborted = () => fail(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    if (signal?.aborted) return aborted()
    const timer = setTimeout(done, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        aborted()
      },
      { once: true },
    )
  })

const parseBody = (body) => {
  if (typeof body !== 'string' || body === '') return body ?? null
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

export const installFakeApi = () => {
  const realFetch = globalThis.fetch

  // imp's client calls fetch(url, init), with the headers as a plain object.
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), document.baseURI)
    // The client's baseUrl is /api, below the base path of the build.
    const path = url.origin === location.origin && url.pathname.match(/\/api(\/.*)?$/)?.[1]
    const method = (init.method ?? 'GET').toUpperCase()
    const found = !(input instanceof Request) && path && resolve(method, path)
    if (!found) return realFetch(input, init)

    const { route, params } = found
    await latency(route.delay ?? 50, init.signal)
    const answer = await route.handler({
      method,
      path,
      params,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(new Headers(init.headers)),
      body: parseBody(init.body),
    })
    return json(answer.status ?? 200, answer.body)
  }
}
