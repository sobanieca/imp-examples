import { expect, test } from 'imp/test'

// A text selector looks through every shadow root. It waits for the text to be
// on screen: a closed notice keeps its words in the page, hidden.
const waitForText = (page, text, options = { visible: true }) =>
  page.waitForSelector(`::-p-text(${text})`, options)

const stat = (page, label) =>
  page.$$eval(
    '.stat',
    (stats, label) => {
      const found = stats.find((node) => node.querySelector('small').textContent === label)
      return found.querySelector('b').textContent
    },
    label,
  )

test('draws the board and a fresh score', async ({ page }) => {
  await page.waitForSelector('canvas')
  expect(await stat(page, 'Score')).toEqual('0')
  expect(await stat(page, 'Lives')).toEqual('3')
  await expect(page).toHaveAccessibleControls()
})

test('is installable: the dev server serves the manifest and the icons', async ({ page }) => {
  const href = await page.$eval('link[rel=manifest]', (link) => link.href)
  const manifest = await page.evaluate(
    (url) => fetch(url).then((response) => response.json()),
    href,
  )
  expect({ name: manifest.name, display: manifest.display }).toEqual({
    name: 'Brickfall',
    display: 'fullscreen',
  })
  expect(manifest.icons.map((entry) => entry.purpose)).toContain('maskable')
  const color = await page.$eval('meta[name=theme-color]', (meta) => meta.content)
  expect(color).toEqual('#0b1026')
})

test('knows the offline cache comes from the build, not the dev server', async ({ page }) => {
  await waitForText(page, 'Dev server: no offline cache')
})

test('launches with a click and pauses with P', async ({ page }) => {
  await page.click('canvas')
  await page.keyboard.press('p')
  await waitForText(page, 'Resume')
  await page.keyboard.press('Space')
  await waitForText(page, 'Pause')
})

test('shows the offline notice when the network goes away', async ({ page }) => {
  await page.setOfflineMode(true)
  await waitForText(page, 'You are offline')
  await waitForText(page, 'Offline')
  await page.setOfflineMode(false)
  await waitForText(page, 'You are offline', { hidden: true })
  await waitForText(page, 'Online')
})
