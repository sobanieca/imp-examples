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

export const THEMES = [
  { value: 'beacon-dark', label: 'Dark', theme: darkTheme },
  { value: 'beacon-light', label: 'Light', theme: lightTheme },
]
