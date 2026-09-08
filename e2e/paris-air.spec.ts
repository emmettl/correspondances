import { expect, test } from '@playwright/test'
import airFixture from '../fixtures/adsb/correspondances-air-morning.json' with { type: 'json' }

const airToggle = 'AIR — avions observés'
const aircraft = airFixture.tracks.find((track) => track.start <= 28_800 && track.end >= 28_860)!

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
})

test('AIR loads on demand, supports callsign follow and returns to rail', async ({ page }) => {
  // Keep the selected fixture inside its observed interval while slow hosted
  // rendering loads AIR and performs the follow assertions.
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('slider', { name: 'Heure' }).fill('28800')
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

test('airport search enables AIR and its isolation can be cleared', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('slider', { name: 'Heure' }).fill('28800')
  const search = page.getByRole('searchbox', { name: 'Rechercher une station, ligne, mission, aéroport ou avion' })
  await search.fill('CDG')
  await page.getByRole('option', { name: /Charles de Gaulle/ }).click()
  await expect(page.locator('main')).toHaveAttribute('data-air-enabled', 'true')
  await expect(page.locator('main')).toHaveAttribute('data-selected-airport', 'cdg')
  const card = page.locator('.ms-airport-hero')
  await expect(card).toContainText('Charles de Gaulle')
  const searchBounds = await page.locator('.paris-search').boundingBox()
  const cardBounds = await card.boundingBox()
  expect(cardBounds!.y).toBeGreaterThanOrEqual(searchBounds!.y + searchBounds!.height)
  await expect(card.locator('.ms-split-flap-board')).not.toHaveAttribute('data-loading')
  await expect(card.locator('tbody button').first()).toBeVisible()
  await card.getByRole('button', { name: 'Arrivées' }).click()
  await expect(card.getByRole('region', { name: 'CDG Arrivées' })).toBeVisible()
  await expect(card.locator('tbody button').first()).toBeVisible()
  await page.waitForTimeout(1000) // Capture the settled characters after switching direction.
  await page.screenshot({ path: testInfo.outputPath('airport-hero.png') })
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

test('AIR failure leaves the railway usable and supports retry', async ({ page, isMobile }) => {
  const url = '**/correspondances-air-morning.json'
  await page.route(url, (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.getByRole('button', { name: airToggle }).click()
  await expect(page.locator('.paris-air-note')).toContainText('AIR indisponible')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.unroute(url)
  if (isMobile) await page.getByRole('button', { name: 'Détails de l’étude' }).click()
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


test('airport boards follow seeks and show a real empty arrival window', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const clock = page.getByRole('slider', { name: 'Heure' })
  await clock.fill('25200')
  await page.getByRole('searchbox').fill('CDG')
  await page.getByRole('option', { name: /Charles de Gaulle/ }).click()
  const card = page.locator('.ms-airport-hero')
  await expect(card.locator('.ms-airport-hero__window')).toHaveText('Fenêtre du tableau 07:00–08:00')
  await expect(card.locator('tbody button').first()).toHaveAccessibleName('AUA37KS')
  await clock.fill('31800')
  await expect(card.locator('.ms-airport-hero__clock')).toContainText('08:50')
  await expect(card.locator('.ms-airport-hero__window')).toHaveText('Fenêtre du tableau 08:40–09:00')
  await expect(card.locator('tbody button').first()).toHaveAccessibleName('SVA130')
  await page.getByRole('searchbox').fill('LBG')
  await page.getByRole('option', { name: /Le Bourget/ }).click()
  await card.getByRole('button', { name: 'Arrivées' }).click()
  await expect(card.locator('.ms-split-flap-board')).toHaveAttribute('data-empty', 'true')
  await expect(card).toContainText('Aucune arrivée dans cette fenêtre.')
  await expect(card.locator('tbody button')).toHaveCount(0)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: testInfo.outputPath('airport-empty.png') })
  await clock.fill('25200')
  await expect(card.locator('.ms-split-flap-board')).not.toHaveAttribute('data-empty')
  await expect(card.locator('tbody button').first()).toHaveAccessibleName('SUBGM')
})
