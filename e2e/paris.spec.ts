import { expect, test } from '@playwright/test'
import openingNetwork from '../fixtures/idfm/correspondances-morning.json' with { type: 'json' }

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Correspondances')
  await expect(page.locator('.scene canvas')).toBeVisible()
  await expect(page.locator('.paris-status')).toContainText('trains en mouvement')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
})

test('opens all eight implemented lines without fetching full-day data', async ({ page }) => {
  const resources = await page.evaluate(() =>
    (globalThis as unknown as {
      performance: {
        getEntriesByType(type: string): readonly { readonly name: string }[]
      }
    }).performance.getEntriesByType('resource').map((entry) => entry.name),
  )
  expect(resources.some((url) => url.includes('correspondances-morning.json'))).toBe(true)
  expect(resources.some((url) => url.includes('correspondances-geography.json'))).toBe(true)
  expect(resources.some((url) => url.includes('correspondances-day-manifest'))).toBe(false)
  expect(resources.some((url) => url.includes('correspondances-central-cross-morning.json'))).toBe(true)
  expect(resources.some((url) => url.includes('correspondances-regional-rer-morning.json'))).toBe(true)
  expect(resources.some((url) => url.includes('-day-manifest') || url.includes('-day-chunks/'))).toBe(false)
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await expect(page.getByRole('button', { name: 'Couche nord–sud Métro 4, Métro 14 et RER B' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Couche régionale RER C, RER D et RER E' })).toHaveAttribute('aria-pressed', 'true')
  expect(resources.some((url) => url.includes('correspondances-air-'))).toBe(false)
  expect(resources.some((url) => url.includes('swiss-rail-morning.json'))).toBe(false)
  expect(resources.some((url) => url.includes('all-change-rail-led'))).toBe(false)
  expect(resources.some((url) => url.includes('local-express-lexington'))).toBe(false)
  await expect(page.locator('.paris-transport')).toContainText('07:00')
  await expect(page.locator('.paris-transport')).toContainText('09:00')
})

test('can disable and restore the north–south layer', async ({ page }) => {
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  const layer = page.getByRole('button', {
    name: 'Couche nord–sud Métro 4, Métro 14 et RER B',
  })
  await layer.click()
  await expect(page.locator('.paris-status')).toContainText('1 couche active')
  await expect(page.locator('.paris-status')).toContainText('605 missions planifiées')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await expect(layer).toHaveAttribute('aria-pressed', 'false')
  await layer.click()
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')

  const search = page.getByRole('searchbox', {
    name: 'Rechercher une station, ligne, mission, aéroport ou avion',
  })
  await search.fill('Métro 14')
  await expect(page.getByRole('option', { name: /Métro 14/ })).toBeVisible()
  await search.press('Enter')
  await expect(page.locator('.paris-status')).toContainText('Métro 14')
})

test('loads the 24-hour study progressively', async ({ page }) => {
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-transport')).toContainText('00:00')
  await expect(page.locator('.paris-transport')).toContainText('24:00')
  await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
  await expect.poll(async () => page.evaluate(() => {
    const browser = globalThis as unknown as {
      performance: {
        getEntriesByType(type: string): readonly { readonly name: string }[]
      }
    }
    return browser.performance.getEntriesByType('resource').map((entry) => entry.name)
  })).toEqual(expect.arrayContaining([
    expect.stringContaining('correspondances-day-manifest.json'),
    expect.stringMatching(/correspondances-day-chunks\/\d{2}-\d{2}\.json/),
  ]))
})

test('keeps the north–south layer across the day while the regional layer is disabled', async ({ page }) => {
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  const layer = page.getByRole('button', {
    name: 'Couche régionale RER C, RER D et RER E',
  })
  await layer.click()
  await expect(page.locator('.paris-status')).toContainText('1 couche active')
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-transport')).toContainText('24:00')
  await expect(page.locator('.paris-status')).toContainText('3561 missions planifiées')
  await expect.poll(async () => page.evaluate(() => {
    const resources = (globalThis as unknown as {
      performance: {
        getEntriesByType(type: string): readonly { readonly name: string }[]
      }
    }).performance.getEntriesByType('resource')
    return resources.map((entry) => entry.name)
  })).toEqual(expect.arrayContaining([
    expect.stringContaining('correspondances-central-cross-day-manifest.json'),
    expect.stringMatching(/correspondances-central-cross-day-chunks\/\d{2}-\d{2}\.json/),
  ]))
  await expect(page.locator('.paris-status')).toContainText('1 couche active')
  const requestedDayLayers = await page.evaluate(() =>
    (globalThis as unknown as {
      performance: { getEntriesByType(type: string): readonly { readonly name: string }[] }
    }).performance.getEntriesByType('resource').map((entry) => entry.name),
  )
  expect(requestedDayLayers.some((url) => url.includes('correspondances-regional-rer-day-'))).toBe(false)
})

test('composes the extended RER layer with the cross and the full clock', async ({ page }) => {
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await expect(page.locator('.paris-status')).toContainText('2 couches actives')

  const search = page.getByRole('searchbox', {
    name: 'Rechercher une station, ligne, mission, aéroport ou avion',
  })
  await search.fill('RER D')
  await expect(page.getByRole('option', {
    name: /^RER D \d+ MISSIONS PLANIFIÉES$/,
  })).toBeVisible()
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
  await expect.poll(async () => page.evaluate(() => {
    const resources = (globalThis as unknown as {
      performance: {
        getEntriesByType(type: string): readonly { readonly name: string }[]
      }
    }).performance.getEntriesByType('resource')
    return resources.map((entry) => entry.name)
  })).toEqual(expect.arrayContaining([
    expect.stringContaining('correspondances-regional-rer-day-manifest.json'),
    expect.stringMatching(/correspondances-regional-rer-day-chunks\/\d{2}-\d{2}\.json/),
  ]))
})

test('keeps the base usable while a default layer is delayed, fails and is retried', async ({ page }) => {
  let releaseLayer!: () => void
  const pendingLayer = new Promise<void>((resolve) => { releaseLayer = resolve })
  const layerUrl = '**/correspondances-central-cross-morning.json'
  await page.route(layerUrl, async (route) => {
    await pendingLayer
    await route.fulfill({ status: 503, body: 'Temporarily unavailable' })
  })
  try {
    await page.reload()
    await expect(page.locator('.paris-status')).toContainText('trains en mouvement')
    await expect(page.locator('.paris-status')).toContainText('se chargent séparément')
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Lecture', exact: true })).toBeVisible()
    releaseLayer()
    await expect(page.locator('.paris-status')).toContainText('Une couche est indisponible')
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    const layer = page.getByRole('button', { name: 'Couche nord–sud Métro 4, Métro 14 et RER B' })
    await expect(layer).toHaveAttribute('aria-pressed', 'false')
    await expect(layer).toHaveAttribute('aria-busy', 'false')
    await page.unroute(layerUrl)
    await layer.click()
    await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
    await expect(page.locator('.paris-status')).toContainText('2 couches actives')
  } finally {
    releaseLayer()
  }
})

test('changes scale without replacing the network or stopping its clock', async ({ page }) => {
  const morningRequestCount = async () =>
    page.evaluate(() =>
      (globalThis as unknown as {
        performance: {
          getEntriesByType(type: string): readonly { readonly name: string }[]
        }
      }).performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('correspondances-morning.json')).length,
    )
  const scale = page.getByRole('button', {
    name: 'Basculer entre le centre et la région',
  })
  const clock = page.getByRole('slider', { name: 'Heure' })
  const before = Number(await clock.inputValue())
  const requestsBeforeScaleChange = await morningRequestCount()
  await scale.click()
  await expect(page.locator('.correspondances-experience')).toHaveAttribute(
    'data-scale-view',
    'centre',
  )
  await expect(page.locator('.paris-status')).toContainText('Le cœur en détail')
  await expect.poll(async () => Number(await clock.inputValue())).toBeGreaterThan(before)
  expect(await morningRequestCount()).toBe(requestsBeforeScaleChange)
  await scale.click()
  await expect(page.locator('.correspondances-experience')).toHaveAttribute(
    'data-scale-view',
    'region',
  )
})

test('Métro and RER can be isolated independently', async ({ page }) => {
  const metro = page.getByRole('button', { name: 'Isoler Métro 1' })
  const rer = page.getByRole('button', { name: 'Isoler RER A' })
  await metro.click()
  await expect(metro).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.paris-status')).toContainText('Métro 1')
  await rer.click()
  await expect(rer).toHaveAttribute('aria-pressed', 'true')
  await expect(metro).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.paris-status')).toContainText('RER A')
})

test('the correspondence director cycles authored hubs using published transfer evidence', async ({ page }) => {
  const nextHub = page.getByRole('button', { name: 'Prochaine correspondance' })
  await nextHub.click()
  await expect(page.locator('.paris-status')).toContainText('Châtelet–Les Halles')
  await expect(page.locator('.paris-status')).toContainText('densité Métro au centre')
  const connection = ((await page.locator('.paris-status').textContent()) ?? '').replace(/\s+/g, ' ').match(
    /(Métro (?:1|4|14)|RER [A-E]) → (Métro (?:1|4|14)|RER [A-E]) · (\d+) min disponibles · (\d+) min minimum publié/,
  )
  expect(connection).not.toBeNull()
  expect(Number(connection?.[3])).toBeGreaterThanOrEqual(Number(connection?.[4]))
  await expect(page.locator('.paris-status')).toContainText('minimum publié')
  await expect(page.getByRole('button', { name: 'Lecture' })).toBeVisible()
  await nextHub.click()
  await expect(page.locator('.paris-status')).toContainText('Gare de Lyon')
  await expect(page.locator('.paris-status')).toContainText('échange Métro–RER est-ouest')
  await nextHub.click()
  await expect(page.locator('.paris-status')).toContainText('La Défense')
  await expect(page.locator('.paris-status')).toContainText('le réseau régional rencontre Paris')
})

test('accent-insensitive station search and mission-code search are selectable', async ({ page }) => {
  const search = page.getByRole('searchbox', {
    name: 'Rechercher une station, ligne, mission, aéroport ou avion',
  })
  await search.fill('chatelet')
  await expect(page.getByRole('option', { name: /Châtelet/ }).first()).toBeVisible()
  await search.press('Enter')
  await expect(page.locator('.paris-status')).toContainText('Châtelet')
  await search.fill('ZKAM31')
  await expect(page.getByRole('option', { name: /ZKAM31/ })).toBeVisible()
  await search.press('Enter')
  await expect(page.locator('.paris-status')).toContainText('ZKAM31')
  await expect(page.locator('.paris-status')).toContainText('Saint-Germain-en-Laye')
})

test('typing in search does not activate global playback shortcuts', async ({ page }) => {
  const search = page.getByRole('searchbox', {
    name: 'Rechercher une station, ligne, mission, aéroport ou avion',
  })
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await search.pressSequentially('Gare de Lyon')
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('phone chrome leaves room for the map with AIR and heart details available on demand', async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, 'Phone layout')
  // Include a shorter Safari viewport and the narrowest supported phone width.
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 664 })
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.getByRole('button', { name: 'AIR — avions observés' }).click()
    await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
    const status = page.locator('.paris-status')
    const info = page.getByRole('button', { name: 'Détails de l’étude' })
    await expect(info).toHaveAttribute('aria-expanded', 'false')
    expect((await status.boundingBox())!.height).toBeLessThanOrEqual(48)
    const routes = (await page.locator('.paris-routes').boundingBox())!
    const tools = (await page.locator('.paris-map-tools').boundingBox())!
    expect(routes.y - tools.y - tools.height).toBeGreaterThan(664 * 0.5)
    await info.click()
    await expect(page.locator('.paris-heart-note')).toBeVisible()
    await expect(page.locator('.paris-air-note')).toBeVisible()
    await info.click()
    await expect(page.locator('.paris-status-details')).toBeHidden()
    const search = page.getByRole('searchbox')
    const emptySearch = (await page.locator('.paris-search').boundingBox())!
    expect((await search.boundingBox())!.width).toBeGreaterThan(90)
    await search.fill('RER A')
    await page.getByRole('option', { name: /^RER A \d+ MISSIONS PLANIFIÉES$/ }).click()
    await expect(page.locator('.paris-status-context')).toBeVisible()
    const populatedSearch = (await page.locator('.paris-search').boundingBox())!
    expect(populatedSearch.height).toBe(emptySearch.height)
    await page.getByRole('button', { name: 'Effacer', exact: true }).click()
    await expect(search).toHaveValue('')
    await page.waitForTimeout(1000) // Let WebKit paint the cleared selection before visual review.
    await page.screenshot({ path: testInfo.outputPath(`compact-phone-${width}.png`) })
    await page.reload()
    await expect(status).toContainText('977 missions planifiées')
  }
})

test('iPhone chrome remains inside the viewport and reduces to the timeline', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone-webkit', 'iPhone-only layout gate')
  const layout = await page.evaluate(() => {
    const browser = globalThis as unknown as {
      document: {
        documentElement: { scrollWidth: number }
        querySelector(selector: string): {
          getBoundingClientRect(): {
            left: number
            right: number
            top: number
            bottom: number
          }
        } | null
      }
      innerWidth: number
      innerHeight: number
    }
    const selectors = [
      '.paris-masthead',
      '.paris-search',
      '.paris-status',
      '.paris-routes',
      '.paris-transport',
    ]
    return {
      overflow: browser.document.documentElement.scrollWidth - browser.innerWidth,
      boxes: selectors.map((selector) => {
        const box = browser.document.querySelector(selector)?.getBoundingClientRect()
        return box ? { selector, left: box.left, right: box.right, top: box.top, bottom: box.bottom } : null
      }),
      width: browser.innerWidth,
      height: browser.innerHeight,
    }
  })
  expect(layout.overflow).toBeLessThanOrEqual(1)
  for (const box of layout.boxes) {
    expect(box, box?.selector).not.toBeNull()
    expect(box?.left, box?.selector).toBeGreaterThanOrEqual(-1)
    expect(box?.right, box?.selector).toBeLessThanOrEqual(layout.width + 1)
    expect(box?.top, box?.selector).toBeGreaterThanOrEqual(-1)
    expect(box?.bottom, box?.selector).toBeLessThanOrEqual(layout.height + 1)
  }
  await page.getByRole('button', { name: 'Plein écran' }).click()
  await expect(page.locator('.correspondances-experience')).toHaveAttribute('data-limited-chrome', 'true')
  await expect(page.locator('.paris-masthead')).not.toBeVisible()
  await expect(page.locator('.paris-transport')).toBeVisible()
})

test('clock updates reuse timetable search with results open and closed', async ({ page }) => {
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const train = openingNetwork.trains[0]!
  const searchText = `${train.shortName} ${train.route} ${train.headsign}`.trim().toLocaleLowerCase('de-CH')
  await page.evaluate((searchText) => {
    const browser = globalThis as unknown as { timetableSearchCount: number }
    browser.timetableSearchCount = 0
    const normalize = String.prototype.normalize
    String.prototype.normalize = function (form) {
      if (String(this) === searchText) browser.timetableSearchCount++
      return normalize.call(this, form)
    }
  }, searchText)
  const search = page.getByRole('searchbox')
  await search.fill('RER A')
  await expect(page.getByRole('option', { name: /^RER A \d+ MISSIONS PLANIFIÉES$/ })).toBeVisible()
  const count = () => page.evaluate(() =>
    (globalThis as unknown as { timetableSearchCount: number }).timetableSearchCount,
  )
  expect(await count()).toBeGreaterThan(0)
  const clock = page.getByRole('slider', { name: 'Heure' })
  const searchesBeforeClock = await count()
  await clock.fill('28920')
  await expect(clock).toHaveValue('28920')
  expect(await count()).toBe(searchesBeforeClock)
  await page.getByRole('option', { name: /^RER A \d+ MISSIONS PLANIFIÉES$/ }).click()
  await expect(search).toHaveAttribute('aria-expanded', 'false')
  const searchesAfterSelection = await count()
  await clock.fill('28980')
  await expect(clock).toHaveValue('28980')
  expect(await count()).toBe(searchesAfterSelection)
  await search.focus()
  await expect(page.getByRole('option', { name: /^RER A \d+ MISSIONS PLANIFIÉES$/ })).toBeVisible()
})

test('returning to the region reuses map buffers and resets the scale control', async ({ page }) => {
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const scale = page.getByRole('button', { name: 'Basculer entre le centre et la région' })
  await scale.click()
  await page.waitForTimeout(2200)
  await page.evaluate(() => {
    const browser = globalThis as unknown as {
      mapBuffersCreated: number
      WebGL2RenderingContext: { prototype: { createBuffer(): unknown } }
    }
    browser.mapBuffersCreated = 0
    const prototype = browser.WebGL2RenderingContext.prototype
    const create = prototype.createBuffer
    prototype.createBuffer = function () {
      browser.mapBuffersCreated++
      return create.call(this)
    }
  })
  await scale.click()
  await page.waitForTimeout(2200)
  expect(await page.evaluate(() =>
    (globalThis as unknown as { mapBuffersCreated: number }).mapBuffersCreated,
  )).toBe(0)
  await expect(scale).toHaveAttribute('aria-pressed', 'false')
  await scale.click()
  await page.getByRole('button', { name: 'Réinitialiser la carte' }).click()
  await expect(scale).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await expect(page.getByRole('button', { name: 'Lecture', exact: true })).toBeVisible()
})
