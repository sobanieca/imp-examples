import { t } from 'imp/i18n'

// Two themes on top of the built-in ones, with Beacon's orange as the primary colour.
export const darkTheme = {
  name: 'beacon-dark',
  base: 'imp-dark',
  tokens: { 'color-primary': '#f46800', 'color-on-primary': '#ffffff' },
}

const lightTheme = {
  name: 'beacon-light',
  base: 'imp-light',
  tokens: { 'color-primary': '#d45a00', 'color-on-primary': '#ffffff' },
}

// A function, so the labels come out in the current language.
export const themeChoices = () => [
  { value: 'beacon-dark', label: t('shell.themes.dark'), theme: darkTheme },
  { value: 'beacon-light', label: t('shell.themes.light'), theme: lightTheme },
]
