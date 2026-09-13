import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import { expect, test } from 'vitest'
import { transformParisScale } from './paris-scale-renderer.ts'
import { parisMapStyle } from '../src/studies/paris-renderer-policy.ts'

test('regional airport infrastructure is independent of AIR and hidden during the heart morph', () => {
  expect(parisMapStyle.airports.independent).toBe(true)
  expect(parisMapStyle.airports.fog).toBe(false)
  const source = readFileSync('node_modules/@motionstudies/three/NationalNetworkScene.js', 'utf8')
  const transformed = transformParisScale(source)
  expect(() => parse(transformed, { sourceType: 'module' })).not.toThrow()
  expect(transformed).toContain('visible: props.mapStyle.airports.visible ?? true')
  expect(readFileSync('src/studies/ParisNetworkScene.tsx', 'utf8')).toContain('visible: (props.spatialLayoutMix ?? 0) === 0')
})

test('airport abbreviations and independent infrastructure use the published renderer directly', () => {
  const source = readFileSync('node_modules/@motionstudies/three/AirTrafficLayer.js', 'utf8')
  expect(() => parse(source, { sourceType: 'module' })).not.toThrow()
  expect(source).toContain('!airportStyle?.independent && visibleAirports.map(')
  expect(source).toContain('airportLabelParts(airport)')
})
