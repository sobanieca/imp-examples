# Beacon - an observability SPA built with imp

A small Grafana: sign in, browse dashboards, watch live panels, edit a dashboard
and its panels, and manage the connectors (data sources) that the panels query.
There is no backend. Every request is answered by the `*.mock.js` files in
`mocks/`, through imp's dev server.

```
imp start          # http://localhost:4400 - any email, password "admin"
imp test --e2e     # the browser spec, fed by the same mocks
imp test --unit    # the unit tests: en and pl carry the same keys
imp build          # the static production build in dist/
```

The app speaks English and Polish (the language picker in the top bar), and its
time-series panels are drawn by [uPlot](https://github.com/leeoniya/uPlot), an
npm package vendored with `imp install`.

## Where to look

| File                               | Shows                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `src/app-map.js`                   | the whole app as one map: nav, routes, access, breadcrumbs                    |
| `src/root.js`                      | `shell`, `router`, the `access` guard, the HTTP client, the crumb picker      |
| `src/sign-in.js`                   | `form`, `FormError`, redirect back to `?next=` after sign-in                  |
| `src/i18n.js`, `src/locales/`      | translations: loaders, live messages, plurals, locale-aware number formats    |
| `src/dashboards/panel.js`          | one component per panel; `chart`, `progress` gauge and `table` with live data |
| `src/dashboards/time-series.js`    | an npm package in a component: uPlot drawn with theme tokens and `lang`       |
| `src/dashboards/dashboard-view.js` | time range, refresh and auto refresh, all through one `computed` value        |
| `src/dashboards/dashboard-edit.js` | the dashboard as one form, panels included; `beforeLeave` for unsaved work    |
| `src/dashboards/panel-editor.js`   | a nested form in a `dialog`, with a live preview of the panel                 |
| `src/connectors/connector-list.js` | `table` with rendered cells, per-row loading state, an add dialog             |
| `src/alert-feed.js`                | a component with no DOM that polls alerts and feeds the `notifications` bell  |
| `mocks/`                           | an in-memory backend: sessions, dashboards, connectors, queries, alerts       |

The CloudWatch connector is broken on purpose, so you can see a failing panel
and a failing test.

## Translations

`src/locales/en.js` and `src/locales/pl.js` default-export the messages, and
`init({ translations })` in `src/main.js` loads only the active one; `imp build`
emits each as its own chunk. The rest follows from a few rules:

- The current language is `<html lang>`. The `langSelect` in the top bar calls
  `setLang`, and `src/root.js` stores the choice so the next visit starts in it.
- Text binds through `lang`, so it changes in place: `say(key)` is a live text
  node for a child, `message(key)` a live state for a prop such as `label`.
  Both live in `src/i18n.js`. A bare `t()` is for a one-off string, like a
  notification or a `confirm()`.
- A prop that is read once, such as the `options` of a `select`, sits in a
  `lang.view(...)` that builds the control again in the new language. Its value
  lives in a state or a form, so the choice survives.
- The nav, the trail and the page title translate from the `appMap` messages,
  with no `t()` in `src/app-map.js`.
- `t()` interpolates but does not pluralize: `plural()` picks the form with
  `Intl.PluralRules`, so Polish gets "1 panel / 3 panele / 7 paneli". Numbers
  and times format with `Intl` in the active language.
- imp's own components (shell, forms, tables, notifications) read their words
  under `imp.*`. English is built in; `pl.js` translates them.
- Data from the backend, such as dashboard titles and alert texts, stays as the
  backend sends it.

`test/locales.test.js` fails when one language lacks a key of the other, or a
plural form its language needs.

## An npm dependency: uPlot

`std/chart` draws categories. The time-series panel needs a real time axis, a
crosshair and drag-to-zoom, so it uses uPlot from npm:

```
imp install uplot
```

That one command downloaded the package, checked it against the npm registry's
signed hash, bundled it into one ES module and wrote:

```
dependencies/uplot/uplot.js        the bundle, committed - no node_modules, no registry at run time
dependencies/uplot/manifest.json   version, integrity hash and license of what is inside
imp.json                           "dependencies": { "uplot": "npm:uplot@1.6.32" }
```

The code imports it by its bare name, `import uPlot from 'uplot'`, in development, in tests and in
`imp build`, which also folds its MIT license into `dist/LICENSES.txt`. `imp audit` checks it
against the OSV vulnerability database, `imp install uplot` again updates it, and
`imp uninstall uplot` removes it.

`src/dashboards/time-series.js` shows what wrapping a library like this takes:

- uPlot ships its layout rules in a CSS file its JavaScript never imports, so the bundle has none.
  A page stylesheet would not reach the shadow root anyway: the component carries those rules,
  written with imp's theme tokens.
- uPlot draws on a canvas, which cannot read CSS variables. The component resolves the theme
  tokens to real colours and draws again when the theme or the language changes.
- uPlot measures its box, so it starts in `onMount`, follows the box with a `ResizeObserver`, and
  is destroyed in `onRemove`.
