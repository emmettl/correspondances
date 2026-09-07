import { expect, test } from '@playwright/test'

const label = 'Couche arcs du Métro 2 et Métro 6'
const morningUrl = '**/correspondances-metro-arcs-morning.json'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
})

test('arcs stay optional, support line search and can be removed from the ten-line study', async ({ page }) => {
  const resources = await page.evaluate(() => (globalThis as unknown as {
    performance: { getEntriesByType(type: string): { name: string }[] }
  }).performance.getEntriesByType('resource').map((entry) => entry.name))
  expect(resources.some((url) => url.includes('metro-arcs'))).toBe(false)
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  const layer = page.getByRole('button', { name: label })
  await expect(layer).toHaveAttribute('aria-pressed', 'false')
  await layer.click()
  await expect(page.locator('.paris-status')).toContainText('1225 missions planifiées')
  await expect(page.locator('.paris-status')).toContainText('3 couches actives')
  for (const line of ['Métro 2', 'Métro 6']) {
    await page.getByRole('searchbox').fill(line)
    await page.getByRole('option', { name: new RegExp(`^${line} \\d+ MISSIONS PLANIFIÉES$`) }).click()
    await expect(page.locator('.paris-status')).toContainText(line)
  }
  await page.getByRole('button', { name: 'Effacer', exact: true }).click()
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-scale-view', 'centre')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await layer.click()
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('searchbox').fill('Métro 6')
  await expect(page.getByRole('option', { name: /^Métro 6/ })).toHaveCount(0)
})

test('arcs share the progressive day and return to the morning window', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await page.getByRole('button', { name: label }).click()
  await expect(page.locator('.paris-status')).toContainText('6478 missions planifiées')
  expect(requests.some((url) => url.includes('metro-arcs-morning'))).toBe(false)
  const chunks = () => new Set(requests.filter((url) => /metro-arcs-day-chunks\//.test(url)))
  expect(chunks().size).toBeGreaterThan(0)
  expect(chunks().size).toBeLessThanOrEqual(3)
  await page.getByRole('slider', { name: 'Heure' }).fill('64800')
  await expect.poll(() => requests.some((url) => url.includes('metro-arcs-day-chunks/18-20'))).toBe(true)
  await expect(page.locator('.paris-status')).toContainText('6478 missions planifiées')
  await page.getByRole('button', { name: 'Étude du matin de deux heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('1225 missions planifiées')
})

for (const failure of ['morning', 'manifest', 'chunk'] as const) {
  const window = failure === 'morning' ? 'morning' : 'day'
  test(`arcs ${failure} failure leaves the base usable and can be retried`, async ({ page }) => {
    const url = failure === 'morning' ? morningUrl : failure === 'manifest' ? '**/correspondances-metro-arcs-day-manifest.json' : '**/correspondances-metro-arcs-day-chunks/08-10.json'
    if (window === 'day') {
      await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
      await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
    }
    await page.route(url, (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
    await expect(page.locator('.paris-status')).toContainText('Une couche est indisponible')
    await expect(page.locator('main')).toHaveAttribute('data-metro-arcs-enabled', 'false')
    await page.getByRole('button', { name: 'Lecture', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await page.unroute(url)
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
    await expect(page.locator('.paris-status')).toContainText(window === 'morning' ? '1225 missions planifiées' : '6478 missions planifiées')
  })
}


test('disabling the arcs while loading cannot add a late layer', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  let responded!: () => void
  const responseFinished = new Promise<void>((resolve) => { responded = resolve })
  await page.route(morningUrl, async (route) => {
    await pending
    try { await route.continue() } catch { /* The disabled layer aborts this request. */ }
    finally { responded() }
  })
  try {
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
    await expect(page.locator('.paris-status')).toContainText('se chargent séparément')
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    const layer = page.getByRole('button', { name: label })
    await expect(layer).toHaveAttribute('aria-busy', 'true')
    await layer.click()
    release()
    await responseFinished
    await expect(page.locator('main')).toHaveAttribute('data-metro-arcs-enabled', 'false')
    await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  } finally { release() }
})
