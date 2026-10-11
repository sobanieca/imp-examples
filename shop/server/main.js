import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { streamSSE } from 'hono/streaming'
import {
  addToCart,
  cartOf,
  checkout,
  clearInbox,
  flashSale,
  inboxOf,
  markAllRead,
  productById,
  products,
  setQuantity,
  subscribe,
  welcome,
} from './store.js'
import { catalogPage, layout, notFoundPage, productPage } from './views.js'

const app = new Hono()

// Every visitor gets an id in a cookie. It keys the cart and the inbox.
app.use(async (c, next) => {
  let visitor = getCookie(c, 'visitor')
  if (!visitor) {
    visitor = crypto.randomUUID()
    setCookie(c, 'visitor', visitor, { httpOnly: true, sameSite: 'Lax', path: '/' })
    welcome(visitor)
  }
  c.set('visitor', visitor)
  await next()
})

const page = (c, { title, description, category, body }, status = 200) => {
  const visitor = c.get('visitor')
  return c.html(
    layout({ title, description, category, cart: cartOf(visitor), inbox: inboxOf(visitor), body }),
    status,
  )
}

// Pages: HTML rendered on the server

app.get('/', (c) => {
  const category = c.req.query('category')
  const shown = category ? products.filter((product) => product.category === category) : products
  return page(c, {
    title: 'Shop',
    description: 'Headphones, watches, lamps and more',
    category,
    body: catalogPage({ products: shown, category }),
  })
})

app.get('/products/:id', (c) => {
  const product = productById(c.req.param('id'))
  if (!product) return c.notFound()
  const related = products
    .filter((other) => other.category === product.category && other.id !== product.id)
    .slice(0, 3)
  return page(c, {
    title: product.name,
    description: product.summary,
    category: product.category,
    body: productPage({ product, related }),
  })
})

// JSON API: what the islands call

app.get('/api/cart', (c) => c.json(cartOf(c.get('visitor'))))

app.post('/api/cart/items', async (c) => {
  const { productId, quantity = 1 } = await c.req.json()
  if (!productById(productId)) return c.json({ message: 'No such product' }, 404)
  return c.json(addToCart(c.get('visitor'), productId, quantity))
})

app.patch('/api/cart/items/:productId', async (c) => {
  const { quantity } = await c.req.json()
  return c.json(setQuantity(c.get('visitor'), c.req.param('productId'), quantity))
})

app.post('/api/checkout', (c) => {
  const order = checkout(c.get('visitor'))
  if (!order) return c.json({ message: 'Your cart is empty' }, 400)
  return c.json({ order, cart: cartOf(c.get('visitor')) }, 201)
})

app.get('/api/notifications', (c) => c.json(inboxOf(c.get('visitor'))))
app.post('/api/notifications/read', (c) => c.json(markAllRead(c.get('visitor'))))
app.delete('/api/notifications', (c) => c.json(clearInbox(c.get('visitor'))))

// Server-sent events: new notifications reach the open page as they happen.
const flashSaleSent = new Set()

app.get('/api/notifications/stream', (c) => {
  const visitor = c.get('visitor')
  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribe(
      visitor,
      (notification) => stream.writeSSE({ data: JSON.stringify(notification) }),
    )
    stream.onAbort(unsubscribe)
    if (!flashSaleSent.has(visitor)) {
      flashSaleSent.add(visitor)
      setTimeout(() => flashSale(visitor), 15_000)
    }
    while (!stream.aborted) {
      await stream.sleep(25_000)
      await stream.writeSSE({ event: 'ping', data: '' })
    }
  })
})

app.use('/*', serveStatic({ root: './public' }))

app.notFound((c) =>
  page(
    c,
    { title: 'Not found', description: 'This page does not exist', body: notFoundPage() },
    404,
  )
)

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8000) })
