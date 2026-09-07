import { expect, test } from '@playwright/test'
import airFixture from '../fixtures/adsb/correspondances-air-morning.json' with { type: 'json' }

const airToggle = 'AIR — avions observés'
const aircraft = airFixture.tracks.find((track) => track.start <= 28_800 && track.end >= 28_860)!

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
})

test('AIR loads on demand, supports callsign follow and returns to rail', async ({ page }) => {
  await page.getByRole('button', { name: airToggle }).click()
  await expect(page.getByRole('button', { name: airToggle })).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.paris-air-note')).toContainText('avions observés')
  const search = page.getByRole('searchbox', { name: 'Rechercher une station, ligne, mission, aéroport ou avion' })
  await search.fill(aircraft.callsign)
  await page.getByRole('option', { name: /AIR · OBSERVÉ/ }).first().click()
  await expect(page.locator('main')).toHaveAttribute('data-selected-air-track', /.+/)
  await expect(page.locator('.paris-status')).toContainText('ft')
  await page.getByRole('button', { name: 'Isoler Métro 1' }).click()
  await expect(page.locator('main')).not.toHaveAttribute('data-selected-air-track')
  await expect(page.locator('.paris-status')).toContainText('Métro 1')
  await page.getByRole('button', { name: airToggle }).click()
  await expect(page.locator('main')).toHaveAttribute('data-air-enabled', 'false')
  await expect(page.locator('.paris-air-note')).toHaveCount(0)
})

test('airport search enables AIR and its isolation can be cleared', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: 'Rechercher une station, ligne, mission, aéroport ou avion' })
  await search.fill('CDG')
  await page.getByRole('option', { name: /Charles de Gaulle/ }).click()
  await expect(page.locator('main')).toHaveAttribute('data-air-enabled', 'true')
  await expect(page.locator('main')).toHaveAttribute('data-selected-airport', 'cdg')
  await expect(page.locator('.paris-status')).toContainText('liaison inférée')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  const isolation = page.getByRole('button', { name: 'Isoler les avions observés' })
  await expect(isolation).toHaveAttribute('aria-pressed', 'true')
  await isolation.click()
  await expect(page.locator('main')).not.toHaveAttribute('data-selected-airport')
  await expect(page.locator('.paris-status')).toContainText('trains en mouvement')
})

test('AIR follows the 24-hour clock through bounded chunks', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (request) => requested.push(request.url()))
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
  await page.getByRole('button', { name: airToggle }).click()
  await expect(page.locator('.paris-air-note')).toContainText('avions observés')
  expect(requested.some((url) => url.includes('correspondances-air-morning.json'))).toBe(false)
  expect(requested.some((url) => url.includes('correspondances-air-day-manifest.json'))).toBe(true)
  const chunks = () => new Set(requested.filter((url) => /correspondances-air-day-\d{2}\.json/.test(url)))
  expect(chunks().size).toBeGreaterThan(0)
  expect(chunks().size).toBeLessThanOrEqual(3)
  await page.getByRole('slider', { name: 'Heure' }).fill('72000')
  await expect.poll(() => requested.some((url) => url.includes('correspondances-air-day-10.json'))).toBe(true)
  await expect(page.locator('.paris-air-note')).toContainText('avions observés')
})

test('AIR failure leaves the railway usable and supports retry', async ({ page }) => {
  const url = '**/correspondances-air-morning.json'
  await page.route(url, (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.getByRole('button', { name: airToggle }).click()
  await expect(page.locator('.paris-air-note')).toContainText('AIR indisponible')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.unroute(url)
  await page.getByRole('button', { name: 'Réessayer AIR' }).click()
  await expect(page.locator('.paris-air-note')).toContainText('avions observés')
  await expect(page.locator('.paris-air-note')).not.toContainText('indisponible')
})


test('scale and reset release aircraft follow without disabling AIR', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: airToggle }).click()
  await expect(page.getByRole('button', { name: airToggle })).toHaveAttribute('aria-busy', 'false')
  const follow = async () => {
    const search = page.getByRole('searchbox')
    // fill() focuses without moving the mouse off the scale control. Its
    // delayed hover help can then cover the result on a slower CI runner.
    await search.click()
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await search.fill(aircraft.callsign)
    await page.getByRole('option', { name: /AIR · OBSERVÉ/ }).first().click()
    await expect(page.locator('main')).toHaveAttribute('data-selected-air-track', /.+/)
  }
  await follow()
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await expect(page.locator('main')).not.toHaveAttribute('data-selected-air-track')
  await expect(page.locator('main')).toHaveAttribute('data-scale-view', 'centre')
  if (!isMobile) {
    await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).hover()
    await expect(page.getByRole('tooltip')).toHaveText('Élargir la carte à la région parisienne')
  }
  await follow()
  await page.getByRole('button', { name: 'Réinitialiser la carte' }).click()
  await expect(page.locator('main')).not.toHaveAttribute('data-selected-air-track')
  await expect(page.locator('main')).toHaveAttribute('data-scale-view', 'region')
  await expect(page.locator('main')).toHaveAttribute('data-air-enabled', 'true')
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
})
