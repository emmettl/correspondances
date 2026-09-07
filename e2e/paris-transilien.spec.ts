import { expect, test } from '@playwright/test'

const groups = [
  ['north', 'Couche Transilien H, K'],
  ['saint-lazare', 'Couche Transilien J, L'],
  ['southwest', 'Couche Transilien N, U, V'],
  ['east', 'Couche Transilien P, R'],
] as const

for (const [slug, label] of groups) {
  for (const window of ['morning', 'day'] as const) {
    test(`Transilien ${slug} rejects mismatched ${window} provenance and retries`, async ({ page }) => {
      const url = `**/correspondances-transilien-${slug}-${window === 'morning' ? 'morning' : 'day-manifest'}.json`
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
      await expect(page.locator('main')).toHaveAttribute(`data-transilien-${slug}-enabled`, 'false')
      await page.unroute(url)
      await page.getByRole('button', { name: 'Afficher les couches' }).click()
      await page.getByRole('button', { name: label }).click()
      await expect(page.locator('main')).toHaveAttribute(`data-transilien-${slug}-enabled`, 'true')
      await expect(page.locator('.paris-status')).toContainText('3 couches actives')
    })
  }
}

test('all 30 rail lines compose across scales and the full day', async ({ page }, testInfo) => {
  // Ten optional groups plus three full-day seeks are substantially slower
  // with CI's software WebGL. Individual assertions retain their 15s limit.
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  for (const label of [
    'Couche arcs du Métro 2 et Métro 6', 'Couche traversées du Métro 5 et Métro 7',
    'Couche portes de l’Est Métro 3 et Métro 11', 'Couche grands boulevards Métro 8 et Métro 9',
    'Couche axes de l’Ouest Métro 12 et Métro 13', 'Couche boucles et liaisons Métro 3bis, Métro 7bis et Métro 10',
    ...groups.map(([, label]) => label),
  ]) {
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
  }
  await expect(page.locator('.paris-status')).toContainText('2967 missions planifiées')
  await expect(page.locator('.paris-status')).toContainText('12 couches actives')
  await page.getByRole('slider', { name: 'Heure' }).fill('28800')
  await expect(page.locator('.paris-status strong')).toHaveText('860')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: testInfo.outputPath('transilien-region.png') })
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-scale-view', 'centre')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: testInfo.outputPath('transilien-centre.png') })
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('16147 missions planifiées')
  for (const time of ['3600', '64800', '84600']) {
    await page.getByRole('slider', { name: 'Heure' }).fill(time)
    await expect(page.locator('.paris-status')).toContainText('16147 missions planifiées')
  }
  let count = 16147
  for (const [index, trips] of [519, 973, 420, 357].entries()) {
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: groups[index][1] }).click()
    count -= trips
    await expect(page.locator('.paris-status')).toContainText(`${count} missions planifiées`)
  }
  await page.getByRole('button', { name: 'Étude du matin de deux heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('2503 missions planifiées')
  expect(errors).toEqual([])
})
