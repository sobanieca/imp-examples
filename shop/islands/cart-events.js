// The islands are separate imp trees, so they cannot share a state. An island
// that changes the cart announces the new cart with a DOM event instead.
const CART_CHANGED = 'impulse:cart-changed'

export const announceCart = (cart) =>
  document.dispatchEvent(new CustomEvent(CART_CHANGED, { detail: cart }))

export const onCartChange = (self, listener) =>
  document.addEventListener(CART_CHANGED, (event) => listener(event.detail), {
    signal: self.abortSignal,
  })
