import { init, mount } from 'imp'
import { installFakeApi } from './fake-api/fake-api.js'
import { readLang, translations } from './i18n.js'
import { root } from './root.js'
import { darkTheme } from './theme.js'

// There is no backend: the fake API answers /api in the page, so a static
// host serves the whole app.
installFakeApi()

// The remembered language wins, then the browser's. A language Beacon does not
// ship falls back to the first one declared, English.
await init({ theme: darkTheme, translations, lang: readLang() ?? navigator.language })

mount('#app', root())
