import { component } from 'imp'
import { luShoppingCart } from 'imp/icons'
import { initHttpClient } from 'imp/http'
import { computed, initState } from 'imp/state'
import { button, icon } from 'imp/std'
import { notify } from 'imp/std/feedback'
import { textField } from 'imp/std/inputs'
import { flex } from 'imp/std/layout'
import { announceCart } from './cart-events.js'

export const addToCart = component('impulse-add-to-cart', {
  setup: (self, { productId, name, withQuantity = false }) => {
    const api = initHttpClient(self, 'impulse.api', { baseUrl: '/api' })
    const quantity = initState(self, 'impulse.quantity', 1)

    const add = async () => {
      const cart = await api.post('/cart/items', { body: { productId, quantity: quantity.get() } })
      announceCart(cart)
      notify({ kind: 'success', title: `${name} is in your cart`, duration: 3000, ttl: 0 })
    }

    return flex(
      { gap: 2, verticalAlign: 'center' },
      withQuantity
        && textField({
          value: quantity,
          type: 'number',
          min: 1,
          max: 9,
          stepper: true,
          ariaLabel: 'Quantity',
        }),
      button(
        {
          variant: 'primary',
          size: withQuantity ? 'md' : 'sm',
          loading: computed([api.pending], (count) => count > 0),
          events: { click: add },
        },
        icon(luShoppingCart, { size: 'sm' }),
        'Add to cart',
      ),
    )
  },
})
