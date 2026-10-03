import { component } from 'imp'
import { div, header, main } from 'imp/html'
import { appLogo } from 'imp/std/shell'
import { board } from './board.js'
import { pwaStatus } from './pwa.js'

// One screen, no router: the game, with the app's install and offline state on top.
const styles = `
  :host { display: block; min-block-size: 100dvh; background: var(--imp-background-app, #0b1026); }
  .page {
    box-sizing: border-box;
    max-inline-size: 640px;
    margin-inline: auto;
    padding:
      max(var(--imp-space-3, 12px), env(safe-area-inset-top))
      max(var(--imp-space-4, 16px), env(safe-area-inset-right))
      max(var(--imp-space-3, 12px), env(safe-area-inset-bottom))
      max(var(--imp-space-4, 16px), env(safe-area-inset-left));
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--imp-space-2, 8px);
    margin-block-end: var(--imp-space-3, 12px);
  }
`

export const app = component('brickfall-app', {
  styles,
  setup: () =>
    div(
      { class: 'page' },
      header(
        appLogo({ label: 'Brickfall', src: 'favicon.svg', href: null }),
        pwaStatus(),
      ),
      main(board()),
    ),
})
