import { expect, test } from '@playwright/test'

const label = 'Couche tram des Maréchaux T3a et T3b'
for (const window of ['morning', 'day'] as const) {
  test(`tram rejects mismatched ${window} provenance and retries`, async ({ page }) => {
    const url = `**/correspondances-tram-marechaux-${window === 'morning' ? 'morning' : 'day-manifest'}.json`
    await page.route(url, async (route) => {
      const response = await route.fetch()
      const data = await response.json()
      data.metadata.sourceSha256 = 'wrong-source'
      await route.fulfill({ json: data })
    })
    await page.goto('/')
    await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    if (window === 'day') {
      await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
      await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
    }
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
    await expect(page.locator('.paris-status')).toContainText('Une couche est indisponible')
    await expect(page.locator('main')).toHaveAttribute('data-tram-marechaux-enabled', 'false')
    await page.unroute(url)
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
    await expect(page.locator('.paris-status')).toContainText(`${window === 'morning' ? 1151 : 5924} missions planifiées`)
    await expect(page.locator('main')).toHaveAttribute('data-tram-marechaux-enabled', 'true')
  })
}

test('tram stations remain searchable across scales and the night gap has no services', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('slider', { name: 'Heure' }).fill('28800')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await page.getByRole('button', { name: label }).click()
  await expect(page.locator('.paris-status')).toContainText('1151 missions planifiées')
  await expect(page.locator('.paris-status strong')).toHaveText('390')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: testInfo.outputPath('tram-region.png') })
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-scale-view', 'centre')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: testInfo.outputPath('tram-centre.png') })
  await page.getByRole('searchbox').fill('Porte Dauphine')
  await page.getByRole('option', { name: /^Porte Dauphine \(Avenue Foch\)/ }).first().click()
  await expect(page.locator('.paris-status')).toContainText('Porte Dauphine (Avenue Foch)')
  await expect(page.locator('main')).toHaveAttribute('data-scale-view', 'centre')
  await page.getByRole('button', { name: 'Effacer', exact: true }).click()
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('5924 missions planifiées')
  // Route search is scoped to loaded journeys. Select during service before
  // seeking into an empty chunk, then verify the isolated count follows it.
  await page.getByRole('searchbox').fill('Tram T3b')
  await page.getByRole('option', { name: /^Tram T3b \d+ MISSIONS PLANIFIÉES$/ }).click()
  await page.getByRole('slider', { name: 'Heure' }).fill('3600')
  await expect(page.locator('.paris-status strong')).toHaveText('0')
  await page.getByRole('slider', { name: 'Heure' }).fill('28800')
  await expect(page.locator('.paris-status strong')).not.toHaveText('0')
})

test('the expanded layer menu stays below search on short screens', async ({ page, isMobile }, testInfo) => {
  await page.setViewportSize(isMobile ? { width: 390, height: 664 } : { width: 1280, height: 640 })
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'AIR — avions observés' }).click()
  await expect(page.getByRole('button', { name: 'AIR — avions observés' })).toHaveAttribute('aria-busy', 'false')
  await page.getByRole('searchbox').fill('Métro 14')
  await expect(page.getByRole('listbox')).toBeVisible()
  const resultsBounds = await page.getByRole('listbox').boundingBox()
  const routesBounds = await page.locator('.paris-routes').boundingBox()
  expect(resultsBounds!.y + resultsBounds!.height).toBeLessThan(routesBounds!.y)
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  const menu = page.getByRole('region', { name: 'Couches du réseau' })
  const searchBounds = await page.locator('.paris-search').boundingBox()
  const menuBounds = await menu.boundingBox()
  expect(menuBounds!.y).toBeGreaterThan(searchBounds!.y + searchBounds!.height)
  await page.screenshot({ path: testInfo.outputPath('tram-menu-short.png') })
  // Exercise both ends of the scrolling menu with normal pointer clicks.
  await page.getByRole('button', { name: 'Couche nord–sud Métro 4, Métro 14 et RER B' }).click()
  await expect(page.locator('.paris-status')).toContainText('605 missions planifiées')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await page.getByRole('button', { name: label }).click()
  await expect(page.locator('.paris-status')).toContainText('779 missions planifiées')
})
