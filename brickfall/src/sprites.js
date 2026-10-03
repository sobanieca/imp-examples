// The pictures the board draws, from public/sprites/. `imp build --pwa` puts
// every file of public/ in the offline cache, so they load with no network.
const NAMES = [
  'background',
  'ball',
  'paddle',
  'crack',
  'brick-red',
  'brick-orange',
  'brick-yellow',
  'brick-green',
  'brick-cyan',
  'brick-purple',
  'brick-steel',
]

// A picture that does not load is null, and the board draws a plain shape instead.
const load = (name) =>
  new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve([name, image])
    image.onerror = () => resolve([name, null])
    image.src = `sprites/${name}.svg`
  })

export const loadSprites = async () => Object.fromEntries(await Promise.all(NAMES.map(load)))
