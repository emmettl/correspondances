import { expect, test } from '@playwright/test'

for (const spec of [
  { slug: 'metro-boulevards', label: 'Couche grands boulevards Métro 8 et Métro 9', lines: ["Métro 8", "Métro 9"], morningTrips: 1247, dayTrips: 6399 },
  { slug: 'metro-west', label: 'Couche axes de l’Ouest Métro 12 et Métro 13', lines: ["Métro 12", "Métro 13"], morningTrips: 1266, dayTrips: 6600 },
  { slug: 'metro-local', label: 'Couche boucles et liaisons Métro 3bis, Métro 7bis et Métro 10', lines: ["Métro 3bis", "Métro 7bis", "Métro 10"], morningTrips: 1144, dayTrips: 6283 },
  { slug: 'metro-arcs', label: 'Couche arcs du Métro 2 et Métro 6', lines: ['Métro 2', 'Métro 6'], morningTrips: 1225, dayTrips: 6478 },
  { slug: 'metro-east', label: 'Couche portes de l’Est Métro 3 et Métro 11', lines: ['Métro 3', 'Métro 11'], morningTrips: 1238, dayTrips: 6477 },
  { slug: 'metro-crossings', label: 'Couche traversées du Métro 5 et Métro 7', lines: ['Métro 5', 'Métro 7'], morningTrips: 1268, dayTrips: 6556 },
]) {
  test.describe(spec.slug, () => {
    const label = spec.label
    const morningUrl = `**/correspondances-${spec.slug}-morning.json`
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
    })

    test('layer stays optional, support line search and can be removed from the study', async ({ page }) => {
      const resources = await page.evaluate(() => (globalThis as unknown as {
        performance: { getEntriesByType(type: string): { name: string }[] }
      }).performance.getEntriesByType('resource').map((entry) => entry.name))
      expect(resources.some((url) => url.includes(spec.slug))).toBe(false)
      await page.getByRole('button', { name: 'Afficher les couches' }).click()
      const layer = page.getByRole('button', { name: label })
      await expect(layer).toHaveAttribute('aria-pressed', 'false')
      await layer.click()
      await expect(page.locator('.paris-status')).toContainText(`${spec.morningTrips} missions planifiées`)
      await expect(page.locator('.paris-status')).toContainText('3 couches actives')
      for (const line of spec.lines) {
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
      await page.getByRole('searchbox').fill(spec.lines[1])
      await expect(page.getByRole('option', { name: new RegExp(`^${spec.lines[1]}`) })).toHaveCount(0)
    })

    test('layer shares the progressive day and return to the morning window', async ({ page }) => {
      const requests: string[] = []
      page.on('request', (request) => requests.push(request.url()))
      await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
      await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
      await page.getByRole('button', { name: 'Afficher les couches' }).click()
      await page.getByRole('button', { name: label }).click()
      await expect(page.locator('.paris-status')).toContainText(`${spec.dayTrips} missions planifiées`)
      expect(requests.some((url) => url.includes(`${spec.slug}-morning`))).toBe(false)
      const chunks = () => new Set(requests.filter((url) => url.includes(`${spec.slug}-day-chunks/`)))
      expect(chunks().size).toBeGreaterThan(0)
      expect(chunks().size).toBeLessThanOrEqual(3)
      await page.getByRole('slider', { name: 'Heure' }).fill('64800')
      await expect.poll(() => requests.some((url) => url.includes(`${spec.slug}-day-chunks/18-20`))).toBe(true)
      await expect(page.locator('.paris-status')).toContainText(`${spec.dayTrips} missions planifiées`)
      await page.getByRole('button', { name: 'Étude du matin de deux heures' }).click()
      await expect(page.locator('.paris-status')).toContainText(`${spec.morningTrips} missions planifiées`)
    })

    for (const failure of ['morning', 'manifest', 'chunk'] as const) {
      const window = failure === 'morning' ? 'morning' : 'day'
      test(`layer ${failure} failure leaves the base usable and can be retried`, async ({ page }) => {
        const url = failure === 'morning' ? morningUrl : failure === 'manifest' ? `**/correspondances-${spec.slug}-day-manifest.json` : `**/correspondances-${spec.slug}-day-chunks/08-10.json`
        if (window === 'day') {
          await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
          await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
        }
        await page.route(url, (route) => route.fulfill({ status: 503, body: 'Unavailable' }))
        await page.getByRole('button', { name: 'Afficher les couches' }).click()
        await page.getByRole('button', { name: label }).click()
        await expect(page.locator('.paris-status')).toContainText('Une couche est indisponible')
        await expect(page.locator('main')).toHaveAttribute(`data-${spec.slug}-enabled`, 'false')
        await page.getByRole('button', { name: 'Lecture', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
        await page.unroute(url)
        await page.getByRole('button', { name: 'Afficher les couches' }).click()
        await page.getByRole('button', { name: label }).click()
        await expect(page.locator('.paris-status')).toContainText(window === 'morning' ? `${spec.morningTrips} missions planifiées` : `${spec.dayTrips} missions planifiées`)
      })
    }


    test('disabling the layer while loading cannot add a late layer', async ({ page }) => {
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
        await expect(page.locator('main')).toHaveAttribute(`data-${spec.slug}-enabled`, 'false')
        await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
      } finally { release() }
    })
  })
}

test('all three optional Metro groups compose independently across morning and day', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  for (const label of ['Couche arcs du Métro 2 et Métro 6', 'Couche traversées du Métro 5 et Métro 7', 'Couche portes de l’Est Métro 3 et Métro 11']) {
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
  }
  await expect(page.locator('.paris-status')).toContainText('1777 missions planifiées')
  await expect(page.locator('.paris-status')).toContainText('5 couches actives')
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('9545 missions planifiées')
  await page.getByRole('slider', { name: 'Heure' }).fill('64800')
  await expect(page.locator('.paris-status')).toContainText('9545 missions planifiées')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await page.getByRole('button', { name: 'Couche traversées du Métro 5 et Métro 7' }).click()
  await expect(page.locator('.paris-status')).toContainText('7972 missions planifiées')
  await expect(page.locator('main')).toHaveAttribute('data-metro-arcs-enabled', 'true')
  await page.getByRole('button', { name: 'Étude du matin de deux heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('1486 missions planifiées')
  await expect(page.locator('main')).toHaveAttribute('data-metro-east-enabled', 'true')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  await page.getByRole('button', { name: 'Couche portes de l’Est Métro 3 et Métro 11' }).click()
  await expect(page.locator('.paris-status')).toContainText('1225 missions planifiées')
})

for (const window of ['morning', 'day'] as const) {
  test(`eastern layer rejects a mismatched ${window} source and retries independently`, async ({ page }) => {
    const file = window === 'morning' ? 'morning' : 'day-manifest'
    const url = `**/correspondances-metro-east-${file}.json`
    await page.route(url, async (route) => {
      const response = await route.fetch()
      const snapshot = await response.json()
      snapshot.metadata.serviceDate = '2026-09-05'
      await route.fulfill({ json: snapshot })
    })
    await page.goto('/')
    await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.getByRole('slider', { name: 'Heure' }).fill('28800')
    if (window === 'day') {
      await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
      await expect(page.locator('.paris-status')).toContainText('4983 missions planifiées')
    }
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: 'Couche portes de l’Est Métro 3 et Métro 11' }).click()
    await expect(page.locator('.paris-status')).toContainText('Une couche est indisponible')
    await expect(page.locator('main')).toHaveAttribute('data-metro-east-enabled', 'false')
    await expect(page.locator('.paris-status strong')).toHaveText('333')
    await page.unroute(url)
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: 'Couche portes de l’Est Métro 3 et Métro 11' }).click()
    await expect(page.locator('.paris-status')).toContainText(`${window === 'day' ? 6477 : 1238} missions planifiées`)
  })
}

test('all layer controls fit the viewport when AIR is enabled', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'AIR — avions observés' }).click()
  await expect(page.getByRole('button', { name: 'AIR — avions observés' })).toHaveAttribute('aria-busy', 'false')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  const controls = page.getByRole('region', { name: 'Couches du réseau' }).getByRole('button')
  await expect(controls).toHaveCount(9)
  const viewport = page.viewportSize()!
  for (const control of await controls.all()) {
    const box = (await control.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
  }
})

test('the complete Metro and RER network shares the full clock and each new group can be removed', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  for (const label of [
    'Couche arcs du Métro 2 et Métro 6',
    'Couche traversées du Métro 5 et Métro 7',
    'Couche portes de l’Est Métro 3 et Métro 11',
    'Couche grands boulevards Métro 8 et Métro 9',
    'Couche axes de l’Ouest Métro 12 et Métro 13',
    'Couche boucles et liaisons Métro 3bis, Métro 7bis et Métro 10',
  ]) {
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
  }
  await expect(page.locator('.paris-status')).toContainText('2503 missions planifiées')
  await expect(page.locator('.paris-status')).toContainText('8 couches actives')
  await page.getByRole('slider', { name: 'Heure' }).fill('28800')
  await expect(page.locator('.paris-status strong')).toHaveText('726')
  await page.getByRole('button', { name: 'Étude de vingt-quatre heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('13878 missions planifiées')
  for (const time of ['3600', '64800', '84600']) {
    await page.getByRole('slider', { name: 'Heure' }).fill(time)
    await expect(page.locator('.paris-status')).toContainText('13878 missions planifiées')
  }
  for (const [label, count] of [
    ['Couche grands boulevards Métro 8 et Métro 9', 12462],
    ['Couche axes de l’Ouest Métro 12 et Métro 13', 10845],
    ['Couche boucles et liaisons Métro 3bis, Métro 7bis et Métro 10', 9545],
  ] as const) {
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
    await expect(page.locator('.paris-status')).toContainText(`${count} missions planifiées`)
  }
  await page.getByRole('button', { name: 'Étude du matin de deux heures' }).click()
  await expect(page.locator('.paris-status')).toContainText('1777 missions planifiées')
  expect(errors).toEqual([])
})

test('the layer menu scrolls to its last control on a short screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 })
  await page.goto('/')
  await expect(page.locator('.paris-status')).toContainText('977 missions planifiées')
  await page.getByRole('button', { name: 'AIR — avions observés' }).click()
  await expect(page.getByRole('button', { name: 'AIR — avions observés' })).toHaveAttribute('aria-busy', 'false')
  await page.getByRole('button', { name: 'Afficher les couches' }).click()
  const menu = page.getByRole('region', { name: 'Couches du réseau' })
  const last = page.getByRole('button', { name: 'Isoler les avions observés' })
  await last.scrollIntoViewIfNeeded()
  const menuBox = (await menu.boundingBox())!
  const controlBox = (await last.boundingBox())!
  expect(menuBox.y).toBeGreaterThanOrEqual(0)
  expect(controlBox.y).toBeGreaterThanOrEqual(menuBox.y)
  expect(controlBox.y + controlBox.height).toBeLessThanOrEqual(menuBox.y + menuBox.height)
  await last.click()
  await expect(menu).toHaveCount(0)
})
