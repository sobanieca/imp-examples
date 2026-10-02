# imp examples

Two apps that show how [imp](https://github.com/sobanieca/imp-ui) works at
scale. Both are plain JavaScript, with no build config, no `package.json` and no
framework other than imp.

| Folder                             | What it is                                                  | imp shows                                                               |
| ---------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`observability/`](observability/) | **Beacon**, a Grafana-like SPA: dashboards, panels, sources | shell, router, guards, forms, charts, tables, dialogs, mocks, e2e tests |
| [`shop/`](shop/)                   | **Impulse**, a shop rendered by Hono on Deno                | imp components as islands in server-rendered HTML                       |

You need the `imp` binary on your `PATH`. The shop also needs
[Deno](https://deno.com/).

```
cd observability && imp start      # http://localhost:4507, sign in with any email and "admin"
cd shop && deno task dev           # http://localhost:8000
```
