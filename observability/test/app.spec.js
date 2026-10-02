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
