import { lang, t } from 'imp/i18n'
import { computed } from 'imp/state'

// The languages Beacon ships. Each one has a file in locales/ with the same keys.
export const LANGUAGES = ['en', 'pl']

export const translations = {
  en: () => import('./locales/en.js'),
  pl: () => import('./locales/pl.js'),
}

// The choice of the language picker lives in localStorage, like the session token.
const KEY = 'beacon.lang'

export const readLang = () => localStorage.getItem(KEY)

export const writeLang = (code) => localStorage.setItem(KEY, code)

// A message as a live text node, for a child: it changes in place with the language.
export const say = (key, values) => lang.text(() => t(key, values))

// A message as a live state, for a prop that takes one, such as `label` or `title`.
export const message = (key, values) => computed([lang], () => t(key, values))

// t() does not pluralize. Intl.PluralRules picks the form, so Polish gets its
// one / few / many forms and English its one / other forms from the same call.
export const plural = (key, count) =>
  t(`${key}.${new Intl.PluralRules(lang.get()).select(count)}`, { count: formatNumber(count) })

export const formatNumber = (value) =>
  Number(value).toLocaleString(lang.get(), { maximumFractionDigits: 1 })

export const formatTime = (time) =>
  new Date(time).toLocaleTimeString(lang.get(), { hour: '2-digit', minute: '2-digit' })

export const formatDateTime = (time) =>
  new Date(time).toLocaleString(lang.get(), { dateStyle: 'medium', timeStyle: 'short' })
