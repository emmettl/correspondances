import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import { expect, test } from 'vitest'
import { transformParisScale } from './paris-scale-renderer.ts'
import { parisOverviewMix, parisTrainLabelBudget } from '../src/editions/paris-scale.ts'

const renderer = readFileSync('node_modules/@motionstudies/three/NationalNetworkScene.js', 'utf8')

test('Paris density hooks fit the pinned renderer and reject changed upstream hooks', () => {
  expect(() => parse(transformParisScale(renderer), { sourceType: 'module' })).not.toThrow()
  expect(() => transformParisScale(renderer.replace('const lastCommand = useRef(0);', 'const lastCommand = useRef(-1);'))).toThrow('hook needs review')
})

test('city scale keeps missions quiet, with bounded closer inspection on phone and desktop', () => {
  for (const width of [390, 1440]) {
    expect(parisTrainLabelBudget(6.6, width, 'auto')).toBe(0)
    expect(parisTrainLabelBudget(37, width, 'auto')).toBe(0)
    expect(parisTrainLabelBudget(3, width, 'off')).toBe(0)
    expect(parisTrainLabelBudget(3, width, 'auto')).toBeGreaterThan(0)
    expect(parisTrainLabelBudget(3, width, 'auto')).toBeLessThanOrEqual(width === 390 ? 3 : 8)
  }
  const samples = [5, 10, 15, 21, 26, 32, 42].map(parisOverviewMix)
  expect(samples[0]).toBe(0)
  expect(samples.at(-1)).toBe(1)
  expect(samples).toEqual([...samples].sort((a, b) => a - b))
  expect(parisOverviewMix(21)).toBeCloseTo(0.5)
})
