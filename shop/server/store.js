// The whole backend of the shop, in memory: products, carts and the
// notification inbox of every visitor. A restart starts again from scratch.

export const CATEGORIES = [
  { id: 'audio', label: 'Audio' },
  { id: 'wearables', label: 'Wearables' },
  { id: 'home', label: 'Home' },
  { id: 'accessories', label: 'Accessories' },
]

export const products = [
  {
    id: 'aurora-headphones',
    name: 'Aurora headphones',
    category: 'audio',
    price: 199,
    emoji: '🎧',
    tint: '#e0e7ff',
    summary: 'Over-ear, noise cancelling, 40 hours of battery.',
    specs: { Battery: '40 h', Weight: '250 g', Bluetooth: '5.3' },
  },
  {
    id: 'pulse-speaker',
    name: 'Pulse speaker',
    category: 'audio',
    price: 89,
    emoji: '🔊',
    tint: '#fce7f3',
    summary: 'A pocket speaker that survives the beach and the rain.',
    specs: { Battery: '12 h', Waterproof: 'IP67', Weight: '410 g' },
  },
  {
    id: 'studio-mic',
    name: 'Studio microphone',
    category: 'audio',
    price: 129,
    emoji: '🎙️',
    tint: '#dcfce7',
    summary: 'USB condenser microphone for calls, streams and podcasts.',
    specs: { Pattern: 'Cardioid', Connection: 'USB-C', 'Sample rate': '96 kHz' },
  },
  {
    id: 'orbit-watch',
    name: 'Orbit watch',
    category: 'wearables',
    price: 249,
    emoji: '⌚',
    tint: '#fef3c7',
    summary: 'Heart rate, sleep and GPS in a light titanium case.',
    specs: { Battery: '7 days', Case: 'Titanium', 'Water resistance': '50 m' },
  },
  {
    id: 'trail-glasses',
    name: 'Trail sunglasses',
    category: 'wearables',
    price: 59,
    emoji: '🕶️',
    tint: '#e0f2fe',
    summary: 'Polarized lenses in a frame that does not slip.',
    specs: { Lenses: 'Polarized', UV: 'UV400', Weight: '28 g' },
  },
  {
    id: 'glow-lamp',
    name: 'Glow lamp',
    category: 'home',
    price: 45,
    emoji: '💡',
    tint: '#fef9c3',
    summary: 'A smart lamp that wakes you up with a slow sunrise.',
    specs: { Brightness: '800 lm', Colours: '16 million', Control: 'App and voice' },
  },
  {
    id: 'brew-kettle',
    name: 'Brew kettle',
    category: 'home',
    price: 79,
    emoji: '☕',
    tint: '#ffedd5',
    summary: 'Pour-over kettle that holds the temperature you pick.',
    specs: { Capacity: '0.9 l', Range: '40-100 °C', Power: '1200 W' },
  },
  {
    id: 'carry-backpack',
    name: 'Carry backpack',
    category: 'accessories',
    price: 119,
    emoji: '🎒',
    tint: '#ede9fe',
    summary: 'A 20 litre backpack with a padded sleeve for a 16" laptop.',
    specs: { Volume: '20 l', Laptop: 'up to 16"', Material: 'Recycled nylon' },
  },
]

export const productById = (id) => products.find((product) => product.id === id)

const carts = new Map()

export const cartOf = (visitor) => {
  const lines = carts.get(visitor) ?? []
  const items = lines.map(({ productId, quantity }) => {
    const { id, name, price, emoji } = productById(productId)
    return { id, name, price, emoji, quantity }
  })
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return { items, total }
}

export const setQuantity = (visitor, productId, quantity) => {
  const lines = (carts.get(visitor) ?? []).filter((line) => line.productId !== productId)
  if (quantity > 0) lines.push({ productId, quantity: Math.min(quantity, 9) })
  carts.set(visitor, lines)
  return cartOf(visitor)
}

export const addToCart = (visitor, productId, quantity) => {
  const line = (carts.get(visitor) ?? []).find((one) => one.productId === productId)
  return setQuantity(visitor, productId, (line?.quantity ?? 0) + quantity)
}

const inboxes = new Map()
const listeners = new Map()

export const inboxOf = (visitor) => inboxes.get(visitor) ?? []

// Store a notification and send it to every open tab of that visitor.
export const pushNotification = (visitor, notification) => {
  const stored = {
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    read: false,
    kind: 'info',
    ...notification,
  }
  inboxes.set(visitor, [stored, ...inboxOf(visitor)].slice(0, 20))
  for (const send of listeners.get(visitor) ?? []) send(stored)
}

export const markAllRead = (visitor) => {
  inboxes.set(visitor, inboxOf(visitor).map((notification) => ({ ...notification, read: true })))
  return inboxOf(visitor)
}

export const clearInbox = (visitor) => {
  inboxes.set(visitor, [])
  return []
}

export const subscribe = (visitor, send) => {
  const set = listeners.get(visitor) ?? new Set()
  set.add(send)
  listeners.set(visitor, set)
  return () => set.delete(send)
}

let orders = 1040

export const checkout = (visitor) => {
  const { items, total } = cartOf(visitor)
  if (items.length === 0) return null
  const order = { id: `#${++orders}`, total }
  carts.set(visitor, [])
  // The warehouse answers a little later, through the notification stream.
  setTimeout(() =>
    pushNotification(visitor, {
      kind: 'success',
      title: `Order ${order.id} has shipped`,
      description: 'It should arrive in two working days.',
    }), 8_000)
  return order
}

export const welcome = (visitor) =>
  pushNotification(visitor, {
    title: 'Welcome to Impulse',
    description: 'Use the code IMP10 for 10% off your first order.',
  })

export const flashSale = (visitor) => {
  const deal = products[Math.floor(Math.random() * products.length)]
  pushNotification(visitor, {
    kind: 'warning',
    title: `Flash sale: ${deal.name} -20%`,
    description: 'Only for the next 15 minutes.',
    link: { href: `/products/${deal.id}`, label: 'See the deal' },
  })
}
