# Impulse - server-rendered pages with imp islands

A shop where [Hono](https://hono.dev/) on Deno renders every page as HTML. imp
runs only where the page is interactive: the cart, the add-to-cart buttons and
the notification center. The pages work and read fine before any JavaScript
arrives.

```
deno task dev      # builds the islands, rebuilds them on change, runs the server on :8000
deno task build    # imp build islands/main.js -> public/islands/main.js
deno task start    # runs the server; build the islands first
```

## How it fits together

```
server/main.js     routes: HTML pages, a JSON API, and a server-sent event stream
server/views.js    the HTML, with island(name, props) placeholders
server/store.js    products, carts and notification inboxes, in memory
islands/main.js    mounts an imp component into every [data-island] element
islands/*.js       the islands themselves
```

- **The server renders a placeholder, imp mounts into it.**
  `island('cart', cart)` writes `<div data-island="cart" data-props="...">`.
  `islands/main.js` finds it and calls `mount(host, () => cart(props))`. The
  props are the server's data, so the cart count is right on the first paint,
  with no extra request.
- **One bundle for every island.** `imp build islands/main.js` writes one
  self-contained file, so all islands share one copy of imp. That is why a
  `notify()` call in an add-to-cart button shows up in the toast region of the
  notification island.
- **Islands talk through the DOM.** Each island is its own imp tree, so they
  cannot share a state. The add-to-cart button sends an `impulse:cart-changed`
  event with the new cart, and the cart island listens for it
  (`islands/cart-events.js`).
- **The server owns the data.** The cart and the inbox live on the server, keyed
  by a cookie, so they survive a page load. New notifications arrive over
  server-sent events: a flash sale 15 seconds after you arrive, and "order
  shipped" 8 seconds after a checkout.
- **The page CSS reads imp's theme tokens** (`public/styles.css`), so the server
  HTML and the islands share one look.
