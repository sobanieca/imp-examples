import { html } from 'hono/html'
import { CATEGORIES } from './store.js'

const money = (amount) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount)

const categoryLabel = (id) => CATEGORIES.find((category) => category.id === id).label

const current = (active) => (active ? html`aria-current="page"` : '')

// A placeholder that islands/main.js mounts an imp component into. The props
// travel as JSON in an attribute; the fallback shows until the script runs.
const island = (name, props, fallback = '') => {
  const json = JSON.stringify(props)
  return html`<div class="island" data-island="${name}" data-props="${json}">${fallback}</div>`
}

export const layout = ({ title, description, cart, inbox, category, body }) => {
  const links = CATEGORIES.map(({ id, label }) => {
    return html`<a href="/?category=${id}" ${current(category === id)}>${label}</a>`
  })
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} - Impulse</title>
    <meta name="description" content="${description}">
    <link rel="icon" href="/favicon.svg">
    <link rel="stylesheet" href="/styles.css">
    <script type="module" src="/islands/main.js"></script>
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">Impulse</a>
      <nav aria-label="Categories">
        <a href="/" ${current(!category)}>All</a>
        ${links}
      </nav>
      <div class="header-islands">
        ${island('notifications', { inbox }, html`<span class="fallback">Notifications</span>`)}
        ${island('cart', cart, html`<span class="fallback">Cart (${cart.items.length})</span>`)}
      </div>
    </header>
    <main>${body}</main>
    <footer class="site-footer">
      Pages rendered by Hono on Node.js. The cart, the buttons and the notifications are imp islands.
    </footer>
  </body>
</html>`
}

const productCard = (product) => {
  const href = `/products/${product.id}`
  return html`<article class="product-card">
  <a class="tile" href="${href}" style="--tint: ${product.tint}" aria-hidden="true" tabindex="-1">
    ${product.emoji}
  </a>
  <h3><a href="${href}">${product.name}</a></h3>
  <p class="summary">${product.summary}</p>
  <div class="buy">
    <span class="price">${money(product.price)}</span>
    ${island('add-to-cart', { productId: product.id, name: product.name })}
  </div>
</article>`
}

export const catalogPage = ({ products, category }) => {
  const heading = category ? categoryLabel(category) : 'All products'
  return html`<section class="hero">
  <h1>Gear that sparks joy</h1>
  <p>Every page here is plain HTML from the server. Only the interactive parts run JavaScript.</p>
</section>
<h2>${heading}</h2>
<div class="product-grid">${products.map(productCard)}</div>`
}

export const productPage = ({ product, related }) => {
  const specs = Object.entries(product.specs).map(([term, value]) => {
    return html`
      <dt>${term}</dt>
      <dd>${value}</dd>
    `
  })
  const buy = { productId: product.id, name: product.name, withQuantity: true }
  return html`<nav class="crumbs" aria-label="Breadcrumbs">
  <a href="/">All products</a> /
  <a href="/?category=${product.category}">${categoryLabel(product.category)}</a>
</nav>
<section class="product">
  <div class="tile large" style="--tint: ${product.tint}" aria-hidden="true">${product.emoji}</div>
  <div class="details">
    <h1>${product.name}</h1>
    <p class="price large">${money(product.price)}</p>
    <p>${product.summary}</p>
    ${island('add-to-cart', buy)}
    <dl class="specs">${specs}</dl>
  </div>
</section>
<h2>You might also like</h2>
<div class="product-grid">${related.map(productCard)}</div>`
}

export const notFoundPage = () =>
  html`
    <section class="hero">
      <h1>Nothing here</h1>
      <p><a href="/">Back to the shop</a></p>
    </section>
  `
