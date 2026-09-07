import { expect, test } from '@playwright/test'

test('unselected minor stations gain map labels when zooming into the centre', async ({ page }, testInfo) => {
  // Station textures are drawn only after a candidate passes admission,
  // projection, collision and the visible-label budget in the actual renderer.
  await page.addInitScript(() => {
    const browser = globalThis as unknown as {
      stationLabelDraws: string[]
      CanvasRenderingContext2D: { prototype: { fillText(text: string, x: number, y: number, maxWidth?: number): void } }
    }
    browser.stationLabelDraws = []
    const prototype = browser.CanvasRenderingContext2D.prototype
    const fillText = prototype.fillText
    prototype.fillText = function (text, x, y, maxWidth) {
      browser.stationLabelDraws.push(text)
      fillText.call(this, text, x, y, maxWidth)
    }
  })
  const drawn = () => page.evaluate(() => (globalThis as unknown as { stationLabelDraws: string[] }).stationLabelDraws)
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect.poll(drawn).toContain('Châtelet')
  expect(await drawn()).not.toContain('Pyramides')
  expect(await drawn()).not.toContain("Château d'Eau")
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await page.waitForTimeout(2200)
  for (let step = 0; step < 4; step++) {
    await page.getByRole('button', { name: 'Zoom avant', exact: true }).click()
    await page.waitForTimeout(800)
  }
  await expect.poll(drawn).toContain('Pyramides')
  await expect.poll(drawn).toContain("Château d'Eau")
  await page.waitForTimeout(1200)
  await page.screenshot({ path: testInfo.outputPath('neighbourhood-labels.png') })
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
})
