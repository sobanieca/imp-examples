import { mount } from 'imp'
import { applyTheme } from 'imp/theme'
import { addToCart } from './add-to-cart.js'
import { cart } from './cart.js'
import { notificationCenter } from './notification-center.js'

const ISLANDS = { 'add-to-cart': addToCart, cart, notifications: notificationCenter }

applyTheme({
  base: 'imp-light',
  name: 'impulse',
  tokens: { 'color-primary': '#4f46e5', 'color-on-primary': '#ffffff' },
})

// Every placeholder that the server rendered becomes an imp component, with
// the props that the server wrote into data-props. One bundle serves them all,
// so the islands share one copy of imp, and one store of notify().
for (const host of document.querySelectorAll('[data-island]')) {
  const island = ISLANDS[host.dataset.island]
  mount(host, () => island(JSON.parse(host.dataset.props)))
}
