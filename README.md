# imp examples

Three apps that show how [imp](https://github.com/sobanieca/imp-ui) works at
scale. All are plain JavaScript, with no build config and no framework other
than imp. Only the shop has a `package.json`, for the Node.js server that renders
its pages.

| Folder                             | What it is                                                  | imp shows                                                                                                |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`observability/`](observability/) | **Beacon**, a Grafana-like SPA: dashboards, panels, sources | shell, router, guards, forms, charts, tables, dialogs, a fake API, e2e tests, translations, an npm dependency |
| [`shop/`](shop/)                   | **Impulse**, a shop rendered by Hono on Node.js             | imp components as islands in server-rendered HTML                                                        |
| [`brickfall/`](brickfall/)         | **Brickfall**, a brick breaker game on a canvas             | a PWA from one `imp.json` block: manifest, icon set, offline service worker, install prompt              |

## Live demos

Two of the apps are hosted on GitHub Pages, at
[sobanieca.github.io/imp-examples](https://sobanieca.github.io/imp-examples/):

- [Beacon](https://sobanieca.github.io/imp-examples/observability/) - the
  observability SPA. It has no backend: a fake API in the page answers its
  requests, so sign in with any email and the password "admin". Changes last
  until the page reloads.
- [Brickfall](https://sobanieca.github.io/imp-examples/brickfall/) - the game.
  It installs as a PWA and plays offline.

The shop renders on a server, so it runs locally only.

`.github/workflows/pages.yml` builds and deploys the site on each push to `main`.
Each app builds with its `pages` environment (`env/pages.json`), which sets
`IMP_BASEPATH` to its sub-path. To host a fork, enable Pages in the repository
settings with the source "GitHub Actions", and change `IMP_BASEPATH` to match
the name of your repository.

## Run locally

You need the `imp` binary on your `PATH`. The shop also needs
[Node.js](https://nodejs.org/) 22 or later.

```
cd observability && imp start            # http://localhost:4400, sign in with any email and "admin"
cd shop && npm install && npm run dev    # http://localhost:8000
cd brickfall && imp start                # http://localhost:4400, then imp build --pwa for the offline app
```
