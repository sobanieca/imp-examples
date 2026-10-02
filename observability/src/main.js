import { init, mount } from 'imp'
import { root } from './root.js'
import { darkTheme } from './theme.js'

await init({ theme: darkTheme })

mount('#app', root())
