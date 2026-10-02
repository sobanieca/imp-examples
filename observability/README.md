# Beacon - an observability SPA built with imp

A small Grafana: sign in, browse dashboards, watch live panels, edit a dashboard
and its panels, and manage the connectors (data sources) that the panels query.
There is no backend. Every request is answered by the `*.mock.js` files in
`mocks/`, through imp's dev server.

```
imp start          # http://localhost:4507 - any email, password "admin"
imp test --e2e     # the browser spec, fed by the same mocks
imp build          # the static production build in dist/
```

## Where to look

| File                               | Shows                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `src/app-map.js`                   | the whole app as one map: nav, routes, access, breadcrumbs                    |
| `src/root.js`                      | `shell`, `router`, the `access` guard, the HTTP client, the crumb picker      |
| `src/sign-in.js`                   | `form`, `FormError`, redirect back to `?next=` after sign-in                  |
| `src/dashboards/panel.js`          | one component per panel; `chart`, `progress` gauge and `table` with live data |
| `src/dashboards/dashboard-view.js` | time range, refresh and auto refresh, all through one `computed` value        |
| `src/dashboards/dashboard-edit.js` | the dashboard as one form, panels included; `beforeLeave` for unsaved work    |
| `src/dashboards/panel-editor.js`   | a nested form in a `dialog`, with a live preview of the panel                 |
| `src/connectors/connector-list.js` | `table` with rendered cells, per-row loading state, an add dialog             |
| `src/alert-feed.js`                | a component with no DOM that polls alerts and feeds the `notifications` bell  |
| `mocks/`                           | an in-memory backend: sessions, dashboards, connectors, queries, alerts       |

The CloudWatch connector is broken on purpose, so you can see a failing panel
and a failing test.
