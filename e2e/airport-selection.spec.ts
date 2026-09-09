import { expect, test } from '@playwright/test'

// Match All Change's fixed-view browser regression in desktop Chromium and
// touch-enabled WebKit; unit tests exercise target size through zoom and pan.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await expect(page.locator('.scene canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  // The canvas/DOM can mount before its camera and label frame callbacks run.
  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  })
})

test('the full airport label enables AIR and opens its board', async ({ page, isMobile }) => {
  await expect(page.locator('main')).toHaveAttribute('data-air-enabled', 'false')
  // Upper-right of CDG's label, outside the circular marker target below it.
  if (isMobile) await page.touchscreen.tap(774, 218)
  else {
    await page.mouse.move(774, 218)
    await expect(page.locator('.scene canvas')).toHaveCSS('cursor', 'pointer')
    await page.mouse.click(774, 218)
  }
  await expect(page.locator('main')).toHaveAttribute('data-selected-airport', 'cdg')
  await expect(page.locator('main')).toHaveAttribute('data-air-enabled', 'true')
  await expect(page.locator('.ms-airport-hero')).toBeVisible()
})

test('marker margins select airports while AIR is already isolated', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: 'AIR — avions observés' }).click()
  await expect(page.locator('.paris-air-note')).toContainText('avions observés')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await page.getByRole('button', { name: 'Isoler les avions observés' }).click()
  // Twenty CSS pixels beside Le Bourget's ring.
  if (isMobile) await page.touchscreen.tap(695, 281)
  else await page.mouse.click(695, 281)
  await expect(page.locator('main')).toHaveAttribute('data-selected-airport', 'le-bourget')
  await expect(page.locator('.ms-airport-hero')).toBeVisible()
})

test('airport drags and hidden heart landmarks cannot select an airport', async ({ page }) => {
  await page.mouse.move(757, 248)
  await page.mouse.down()
  await page.mouse.move(797, 288, { steps: 8 })
  await page.mouse.move(757, 248, { steps: 8 })
  await page.mouse.up()
  await expect(page.locator('main')).not.toHaveAttribute('data-selected-airport')
  await expect(page.locator('main')).toHaveAttribute('data-air-enabled', 'false')
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-layout-mix', '1.000')
  await page.mouse.click(757, 248)
  await expect(page.locator('main')).not.toHaveAttribute('data-selected-airport')
  await expect(page.locator('main')).toHaveAttribute('data-air-enabled', 'false')
  await page.getByRole('button', { name: 'Réinitialiser la carte' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-layout-mix', '0.000')
  await page.mouse.click(625, 483)
  await expect(page.locator('main')).toHaveAttribute('data-selected-airport', 'orly')
})
