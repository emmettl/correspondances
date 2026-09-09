/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { installWebGLDrawCounters, sampleWebGLDraws } from './webgl-draws'

test('paused Paris rail retain buffers through idle frames and redraw seeks and selection', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.scene canvas')).toBeVisible()
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.evaluate(() => {
    const probe = window as typeof window & { vehicleUploads: number }
    probe.vehicleUploads = 0
    const original = WebGL2RenderingContext.prototype.bufferSubData
    WebGL2RenderingContext.prototype.bufferSubData = function (this: WebGL2RenderingContext, ...args: Parameters<typeof original>) {
      probe.vehicleUploads++
      original.apply(this, args)
    } as typeof original
  })
  const count = () => page.evaluate(() => (window as typeof window & { vehicleUploads: number }).vehicleUploads)
  const reset = () => page.evaluate(() => { (window as typeof window & { vehicleUploads: number }).vehicleUploads = 0 })
  const sample = () => page.evaluate(async () => {
    const probe = window as typeof window & { vehicleUploads: number }
    for (let i = 0; i < 3; i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    const before = probe.vehicleUploads
    for (let i = 0; i < 4; i++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    return probe.vehicleUploads - before
  })
  expect(await sample()).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect.poll(sample).toBe(0)
  await reset()
  await page.getByRole('slider', { name: 'Heure' }).fill('27900')
  await expect.poll(count).toBeGreaterThan(0)
  await expect.poll(sample).toBe(0)
  await reset()
  await page.getByRole('searchbox').fill('RER A')
  await page.getByRole('option').first().click()
  await expect.poll(count).toBeGreaterThan(0)
  await expect.poll(sample).toBe(0)
  await page.getByRole('button', { name: 'Effacer', exact: true }).click()
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-layout-mix', '1.000')
  await expect.poll(sample).toBe(0)
  await page.getByRole('button', { name: 'Lecture', exact: true }).click()
  await expect.poll(sample).toBeGreaterThan(0)
})

test('air-only playback submits visible geometry without invisible hit-sphere draws', async ({ page }) => {
  await page.addInitScript(installWebGLDrawCounters)
  await page.goto('/')
  await expect(page.locator('.scene canvas')).toBeVisible()
  await page.getByRole('button', { name: 'AIR — avions observés' }).click()
  await expect(page.locator('.paris-air-note')).toContainText('avions observés')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await page.getByRole('button', { name: 'Isoler les avions observés' }).click()
  await expect(page.locator('.paris-status')).toContainText('Le ciel parisien')
  const draws = await page.evaluate(sampleWebGLDraws)
  expect(draws.draws).toBeGreaterThan(0)
  expect(draws.zeroOpacityDraws).toBe(0)
})
