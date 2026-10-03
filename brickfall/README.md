# Brickfall - an installable, offline brick breaker built with imp

A brick breaker on a `<canvas>`: steer the paddle with the mouse, a finger or the arrow keys, break
three levels of bricks (steel ones take two hits), and keep your best score. It is also a Progressive
Web App. It installs to a home screen or a desktop, opens fullscreen, and plays with no network.

```
imp start          # http://localhost:4507 - installable already, not yet offline
imp build --pwa    # dist/: the game, its manifest, its icons and an offline service worker
imp test --unit    # the game rules, with no DOM
imp test --e2e     # the page in Chrome: board, manifest, pause, offline notice
```

## What imp does for the PWA

The whole PWA is one block in `imp.json` and one picture:

```json
"pwa": {
  "name": "Brickfall",
  "shortName": "Brickfall",
  "icon": "icon.svg",
  "themeColor": "#0b1026",
  "backgroundColor": "#0b1026",
  "display": "fullscreen"
}
```

From that, `imp build --pwa` writes:

| Output                                                                 | From                                                     |
| ---------------------------------------------------------------------- | -------------------------------------------------------- |
| `icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`           | `icon.svg`, rendered at each size                        |
| `icons/icon-maskable-512.png`                                          | `icon.svg`, padded on `backgroundColor` for round masks  |
| `manifest.webmanifest`                                                 | the `pwa` block, with every field install needs          |
| `sw.js`                                                                | the build itself: its precache list is the build's files |
| `<link rel="manifest">`, `theme-color`, apple-touch-icon, registration | injected into the `<head>` of `dist/index.html`          |

No source file registers a worker or writes a manifest. The worker caches exactly the files of the
build: the hashed `chunks/`, the page, the icons, and everything in `public/`, which here means the
sprites. So after the first visit the game, its pictures and its icons all load offline. A deploy is
a new cache, and the new worker takes over by itself: there is no update prompt to write.

`imp start` serves the manifest and the icons too, so the dev server is installable. The offline
worker comes only from the build. Try it with any static server, on a port other than `imp start`'s:

```
imp build --pwa && cd dist && python3 -m http.server 4620
```

Open http://localhost:4620, wait for "Ready offline", then switch the network off in the developer
tools and reload.

## What the app adds

`src/pwa.js` is the app's side, a status bar above the board:

- **Install**: Chrome and Edge fire `beforeinstallprompt` once. The module keeps it, and the
  Install button calls `prompt()`. Safari has no prompt, so an iPhone gets the Share-menu hint, and
  an installed app says it runs as one.
- **Ready offline**: `navigator.serviceWorker.ready` settles when the build's worker is active, so
  its cache is full. Under `imp start` the active worker is imp's dev worker, which caches nothing,
  and the tag says so.
- **Offline**: the `online` and `offline` events drive a tag and a `notice`.

The rest of the game is written to be an app, not a page:

- The best score and the sound switch live in `localStorage`, so they are there offline.
- Sounds are made by the Web Audio API: no audio files to download or cache.
- A wake lock keeps the screen on while the ball is in play. The game pauses when the tab is hidden.
- A missed ball vibrates a phone. The viewport covers the notch, and the page pads the safe areas.

## Where to look

| File                | Shows                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| `imp.json`          | the `pwa` block: everything the manifest, the icons and the worker come from   |
| `icon.svg`          | the one source picture of every icon size                                      |
| `src/pwa.js`        | the install prompt, the worker's state, online and offline                     |
| `src/board.js`      | a canvas in a component: the frame loop, input, a HUD bound to one state       |
| `src/game.js`       | the rules with no DOM: paddle, ball, bricks, lives, levels                     |
| `src/levels.js`     | the levels, one string per row of bricks                                       |
| `src/sprites.js`    | the pictures from `public/sprites/`, with a plain shape when one fails to load |
| `public/sprites/`   | the SVG sprites the board draws, cached for offline by the build               |
| `test/game.test.js` | unit tests of the rules                                                        |
| `test/app.spec.js`  | e2e: the board, the manifest and theme colour, pause, the offline notice       |

The game object changes 60 times a second, so it stays a plain object on `self`. Only a summary, the
score, lives, level, phase and best, goes into imp state each frame, and a `set` with the same
content notifies nobody. So the HUD updates when a number changes, not on every frame.
