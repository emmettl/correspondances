import { writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { chromium } from '@playwright/test'

const { values } = parseArgs({ options: {
  url: { type: 'string', default: 'http://127.0.0.1:4178' },
  channel: { type: 'string' },
  headless: { type: 'boolean', default: false },
  'metro-arcs': { type: 'boolean', default: false },
  'metro-crossings': { type: 'boolean', default: false },
  'metro-east': { type: 'boolean', default: false },
  'all-metro': { type: 'boolean', default: false },
  'metro-boulevards': { type: 'boolean', default: false },
  'metro-west': { type: 'boolean', default: false },
  'metro-local': { type: 'boolean', default: false },
  width: { type: 'string', default: '1920' },
  height: { type: 'string', default: '1080' },
  dpr: { type: 'string', default: '1.5' },
  duration: { type: 'string', default: '5000' },
  fps: { type: 'string', default: '60' },
  output: { type: 'string' },
} })
const numeric = Object.fromEntries(
  ['width', 'height', 'dpr', 'duration', 'fps'].map((key) => [key, Number(values[key])]),
)
for (const [key, value] of Object.entries(numeric)) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${key} must be positive`)
}
if (!Number.isInteger(numeric.width) || !Number.isInteger(numeric.height)) {
  throw new Error('--width and --height must be integers')
}

const browser = await chromium.launch({ channel: values.channel, headless: values.headless })
try {
  const page = await browser.newPage({
    viewport: { width: numeric.width, height: numeric.height },
    deviceScaleFactor: numeric.dpr,
  })
  page.setDefaultTimeout(30_000)
  await page.goto(values.url)
  await page.locator('.paris-status').filter({ hasText: '977 missions planifiées' }).waitFor()
  await page.locator('.scene canvas').waitFor()
  let morningTrips = 977
  for (const [flag, label, trips] of [
    ['metro-arcs', 'Couche arcs du Métro 2 et Métro 6', 248],
    ['metro-crossings', 'Couche traversées du Métro 5 et Métro 7', 291],
    ['metro-east', 'Couche portes de l’Est Métro 3 et Métro 11', 261],
    ['metro-boulevards', 'Couche grands boulevards Métro 8 et Métro 9', 270],
    ['metro-west', 'Couche axes de l’Ouest Métro 12 et Métro 13', 289],
    ['metro-local', 'Couche boucles et liaisons Métro 3bis, Métro 7bis et Métro 10', 167],
  ]) {
    if (!values[flag] && !values['all-metro']) continue
    await page.getByRole('button', { name: 'Afficher les couches' }).click()
    await page.getByRole('button', { name: label }).click()
    morningTrips += trips
    await page.locator('.paris-status').filter({ hasText: `${morningTrips} missions planifiées` }).waitFor()
  }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const scenarios = []
  async function sample(name, settleMilliseconds = 2500) {
    // Exclude lazy loading, camera settling, and initial shader compilation.
    await page.waitForTimeout(settleMilliseconds)
    const before = await cdp.send('Performance.getMetrics')
    const intervals = await page.evaluate((duration) => new Promise((resolve) => {
      const samples = []
      let started
      let previous
      const frame = (now) => {
        started ??= now
        if (previous !== undefined) samples.push(now - previous)
        previous = now
        if (now - started >= duration) resolve(samples)
        else requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    }), numeric.duration)
    const after = await cdp.send('Performance.getMetrics')
    const round = (number) => Math.round(number * 100) / 100
    const sorted = [...intervals].sort((a, b) => a - b)
    const percentile = (fraction) => round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))])
    const budget = 1000 / numeric.fps
    const percentage = (limit) => round(100 * intervals.filter((ms) => ms > limit).length / intervals.length)
    const metrics = Object.fromEntries(
      ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map((name) => [
        name,
        round(1000 * (after.metrics.find((metric) => metric.name === name).value
          - before.metrics.find((metric) => metric.name === name).value)),
      ]),
    )
    scenarios.push({
      name,
      frames: intervals.length,
      meanFps: round(1000 * intervals.length / intervals.reduce((sum, ms) => sum + ms, 0)),
      p50Ms: percentile(0.5),
      p95Ms: percentile(0.95),
      p99Ms: percentile(0.99),
      maxMs: round(sorted.at(-1)),
      overBudgetPercent: percentage(budget),
      // Allows timestamp jitter around one refresh; exposes clearly missed frames.
      overOneAndHalfBudgetsPercent: percentage(budget * 1.5),
      mainThreadMilliseconds: metrics,
    })
  }
  await sample('opening')
  await page.getByRole('searchbox').fill('RER A')
  await page.getByRole('option', { name: /RER A/ }).first().waitFor()
  await sample('search-open')
  await page.getByRole('option', { name: /RER A/ }).first().click()
  await sample('selected-search-closed')
  await page.getByRole('button', { name: 'Effacer' }).click()
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await sample('to-centre', 0)
  await sample('centre')
  await page.getByRole('button', { name: 'Basculer entre le centre et la région' }).click()
  await sample('to-region', 0)
  const environment = await page.evaluate(() => {
    const canvas = document.querySelector('.scene canvas')
    const gl = canvas.getContext('webgl2')
    const debug = gl?.getExtension('WEBGL_debug_renderer_info')
    return {
      userAgent: navigator.userAgent,
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      canvas: { width: canvas.width, height: canvas.height },
    }
  })
  const report = JSON.stringify({
    capturedAt: new Date().toISOString(),
    platform: process.platform,
    browserVersion: browser.version(),
    settings: { ...numeric, channel: values.channel ?? 'chromium', headless: values.headless, metroArcs: values['metro-arcs'], metroCrossings: values['metro-crossings'], metroEast: values['metro-east'], allMetro: values['all-metro'], metroBoulevards: values['metro-boulevards'], metroWest: values['metro-west'], metroLocal: values['metro-local'] },
    environment,
    scenarios,
  }, null, 2)
  if (values.output) await writeFile(values.output, `${report}\n`)
  console.log(report)
} finally {
  await browser.close()
}
