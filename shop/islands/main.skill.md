# islands/main.js - the islands entry of the Impulse shop

`imp build islands/main.js --output public/islands` bundles this module into one self-contained
file, `public/islands/main.js`, that every server page loads. It exports nothing. When it runs it:

- applies the `impulse` theme, `imp-light` with an indigo primary color;
- mounts an imp component into every `[data-island]` element of the page, with the props that the
  server wrote as JSON into `data-props`.

```html
<div data-island="cart" data-props='{"items":[],"total":0}'></div>
<script type="module" src="/islands/main.js"></script>
```

| `data-island`   | Component            | Module                   |
| --------------- | -------------------- | ------------------------ |
| `add-to-cart`   | `addToCart`          | `add-to-cart.js`         |
| `cart`          | `cart`               | `cart.js`                |
| `notifications` | `notificationCenter` | `notification-center.js` |

- **One bundle serves every island**, so they share one copy of imp, and one store of `notify()`.
- **The islands are separate imp trees.** They talk through the DOM: the add-to-cart button sends an
  `impulse:cart-changed` event with the new cart, and the cart island listens for it
  (`cart-events.js`).
- To add an island, write its component and add it to `ISLANDS` under the name that the server
  passes to `island(name, props)` in `server/views.js`.
