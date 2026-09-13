/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
test('station departures fit narrow cards and select their study train', async ({ page }) => {
 await page.emulateMedia({ reducedMotion: 'reduce' })
 await page.goto('/')
 await expect(page.locator('canvas').first()).toBeVisible()
 const search = page.getByRole('searchbox')
 await search.fill('chatelet')
 await page.getByRole('option').first().click()
 const card = page.locator('.edition-station-hero')
 await expect(card.locator('.ms-dot-matrix-board')).toBeVisible()
 await expect(card.locator('tbody button').first()).toBeVisible()
 for (const width of [280, 360, 520]) {
   await card.evaluate((element, width) => { (element as HTMLElement).style.width = `${Math.min(width, innerWidth - 72)}px` }, width)
   await expect.poll(() => card.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
 }
 await page.screenshot({ path: 'test-results/station-hero.png' })
 await card.locator('tbody button').first().click()
 await expect(card).toHaveCount(0)
})
