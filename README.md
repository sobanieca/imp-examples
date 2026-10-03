# imp examples

Three apps that show how [imp](https://github.com/sobanieca/imp-ui) works at
scale. All are plain JavaScript, with no build config, no `package.json` and no
framework other than imp.

| Folder                             | What it is                                                  | imp shows                                                                                                |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`observability/`](observability/) | **Beacon**, a Grafana-like SPA: dashboards, panels, sources | shell, router, guards, forms, charts, tables, dialogs, mocks, e2e tests, translations, an npm dependency |
| [`shop/`](shop/)                   | **Impulse**, a shop rendered by Hono on Deno                | imp components as islands in server-rendered HTML                                                        |
| [`brickfall/`](brickfall/)         | **Brickfall**, a brick breaker game on a canvas             | a PWA from one `imp.json` block: manifest, icon set, offline service worker, install prompt              |

You need the `imp` binary on your `PATH`. The shop also needs
[Deno](https://deno.com/).

```
cd observability && imp start      # http://localhost:4507, sign in with any email and "admin"
cd shop && deno task dev           # http://localhost:8000
cd brickfall && imp start          # http://localhost:4507, then imp build --pwa for the offline app
```
