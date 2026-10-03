import { expect, test } from 'imp/test'
import en from '../src/locales/en.js'
import pl from '../src/locales/pl.js'

// Only the active language is in memory, so a key missing from one file shows
// as the raw key in that language. Every file must carry every key.

const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other']

const keysOf = (messages, prefix = '') =>
  Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  )

// A plural group is compared by its name: each language has its own forms.
const groupsOf = (messages) =>
  [
    ...new Set(
      keysOf(messages)
        .filter((key) => !key.startsWith('imp.'))
        .map((key) => key.split('.'))
        .map((path) => (PLURAL_FORMS.includes(path.at(-1)) ? path.slice(0, -1) : path).join('.')),
    ),
  ].sort()

test('en and pl translate the same keys', () => {
  expect(groupsOf(pl)).toEqual(groupsOf(en))
})

for (const [code, messages] of Object.entries({ en, pl })) {
  test(`${code} has every plural form its language needs`, () => {
    const needed = new Intl.PluralRules(code).resolvedOptions().pluralCategories
    const plurals = keysOf(messages).filter((key) => PLURAL_FORMS.includes(key.split('.').at(-1)))
    for (const group of new Set(plurals.map((key) => key.replace(/\.[^.]+$/, '')))) {
      for (const form of needed) expect(plurals).toContain(`${group}.${form}`)
    }
  })
}
