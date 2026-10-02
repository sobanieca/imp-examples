import { component } from 'imp'
import { span } from 'imp/html'
import { luMinus, luPlus, luShoppingCart, luTrash2 } from 'imp/icons'
import { initHttpClient, useHttpClient } from 'imp/http'
import { computed, initState, useState } from 'imp/state'
import { button, icon, text } from 'imp/std'
import { list } from 'imp/std/data'
import { emptyState, tag } from 'imp/std/display'
import { notify } from 'imp/std/feedback'
import { drawer, flex, stack } from 'imp/std/layout'
import { onCartChange } from './cart-events.js'
import { money } from './money.js'

const iconButton = (label, glyph, onClick) =>
  button(
    { variant: 'ghost', square: true, size: 'sm', label, events: { click: onClick } },
    icon(glyph),
  )

const cartContents = component('impulse-cart-contents', {
  setup: (self, { onCheckout }) => {
    const api = useHttpClient(self, 'impulse.api')
    const cart = useState(self, 'impulse.cart')

    const setQuantity = async (productId, quantity) =>
      cart.set(await api.patch(`/cart/items/${productId}`, { body: { quantity } }))

    const items = computed([cart], ({ items }) =>
      items.map((item) => ({
        ...item,
        title: item.name,
        description: `${item.quantity} x ${money(item.price)}`,
      })))

    // Rebuilt only when the cart turns empty or stops being empty. The list and
    // the total follow every other change in place.
    const isEmpty = computed([cart], ({ items }) => items.length === 0)

    return isEmpty.view((empty) =>
      empty
        ? emptyState({
          icon: luShoppingCart,
          title: 'Your cart is empty',
          description: 'Add something you like.',
        })
        : stack(
          { gap: 4 },
          list({
            label: 'Products in your cart',
            items,
            leading: (item) => span({ style: { fontSize: '1.75rem' } }, item.emoji),
            actions: (item) =>
              flex(
                { gap: 1, verticalAlign: 'center' },
                iconButton(
                  `One less ${item.name}`,
                  luMinus,
                  () => setQuantity(item.id, item.quantity - 1),
                ),
                iconButton(
                  `One more ${item.name}`,
                  luPlus,
                  () => setQuantity(item.id, item.quantity + 1),
                ),
                iconButton(`Remove ${item.name}`, luTrash2, () => setQuantity(item.id, 0)),
              ),
          }),
          flex(
            { horizontalAlign: 'justify', verticalAlign: 'center' },
            text({ weight: 'bold', size: 'lg' }, cart.text(({ total }) => `Total ${money(total)}`)),
            button(
              {
                variant: 'primary',
                loading: computed([api.tracked('checkout').pending], (count) => count > 0),
                events: { click: onCheckout },
              },
              'Check out',
            ),
          ),
        )
    )
  },
})

// The cart button of the header and the drawer it opens. The server renders
// the first cart into data-props, so the count is right before any request.
export const cart = component('impulse-cart', {
  setup: (self, initialCart) => {
    const api = initHttpClient(self, 'impulse.api', { baseUrl: '/api' })
    const cart = initState(self, 'impulse.cart', initialCart)
    const open = initState(self, 'impulse.cart.open', false)

    onCartChange(self, cart.set)

    const count = computed(
      [cart],
      ({ items }) => items.reduce((sum, item) => sum + item.quantity, 0),
    )

    const checkout = async () => {
      const { order, cart: emptied } = await api.post('/checkout', { track: 'checkout' })
      cart.set(emptied)
      open.set(false)
      notify({
        kind: 'success',
        title: `Order ${order.id} is placed`,
        description: `We charged ${money(order.total)}. You get a notification when it ships.`,
        ttl: 0,
      })
    }

    return span(
      button(
        {
          variant: 'ghost',
          label: computed([count], (total) => `Cart, ${total} items`),
          events: { click: () => open.set(true) },
        },
        icon(luShoppingCart),
        'Cart',
        count.view((total) => total > 0 && tag({ color: 'red', size: 'sm' }, total)),
      ),
      drawer({ title: 'Your cart', open }, cartContents({ onCheckout: checkout })),
    )
  },
})
