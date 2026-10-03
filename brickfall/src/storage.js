// The best score and the sound switch stay on the device, so they survive an
// offline session. Private windows can refuse storage: then nothing is kept.
export const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    return value == null ? fallback : JSON.parse(value)
  } catch {
    return fallback
  }
}

export const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage is full or blocked: the game goes on without it.
  }
}
