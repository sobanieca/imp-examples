import { expect, test } from 'imp/test'

// The mocks answer every request, so the suite runs with no backend.

test('signs in and lists the dashboards', async ({ page }) => {
  await page.waitForSelector('input[type=password]')
  await page.type('input[type=password]', 'admin')
  await page.keyboard.press('Enter')
  await page.waitForSelector('a[href="/dashboards/api-overview"]')
  await expect(page).toHaveAccessibleControls()
})

test('opens a dashboard with its panels', async ({ page }) => {
  await page.click('a[href="/dashboards/api-overview"]')
  await page.waitForSelector('imp-chart')
  const panels = await page.$$('beacon-panel')
  expect(panels.length).toEqual(7)
})

test('draws the time-series panels with the vendored uPlot', async ({ page }) => {
  await page.waitForSelector('beacon-time-series >>> canvas')
  const charts = await page.$$('beacon-time-series')
  expect(charts.length).toEqual(1)
  // uPlot's legend lists the series of the query: the HTTP methods.
  const legend = await page.$eval('beacon-time-series >>> .u-legend', (el) => el.textContent)
  expect(legend).toContain('GET')
})

test('switches to Polish and remembers it', async ({ page }) => {
  await page.click('button[aria-label^="Language"]')
  const items = await page.$$('[role=menuitemradio]')
  for (const item of items) {
    if ((await item.evaluate((el) => el.textContent)).includes('polski')) await item.click()
  }
  await page.waitForFunction(() => document.documentElement.lang === 'pl')
  await page.waitForSelector('a[href="/dashboards"]')
  expect(await page.$eval('a[href="/dashboards"]', (el) => el.textContent)).toContain('Pulpity')

  await page.reload()
  await page.waitForSelector('beacon-panel')
  expect(await page.evaluate(() => document.documentElement.lang)).toEqual('pl')
  expect(await page.$eval('a[href="/dashboards"]', (el) => el.textContent)).toContain('Pulpity')
})
