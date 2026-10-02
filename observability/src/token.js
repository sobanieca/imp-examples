// The session token lives in localStorage, so a reload keeps you signed in.
const KEY = 'beacon.token'

export const readToken = () => localStorage.getItem(KEY)

export const writeToken = (token) =>
  token ? localStorage.setItem(KEY, token) : localStorage.removeItem(KEY)
