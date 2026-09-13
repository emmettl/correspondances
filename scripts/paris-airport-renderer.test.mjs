import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import { expect, test } from 'vitest'
import { transformParisAirportLayer } from './paris-airport-renderer.ts'
import { transformParisScale } from './paris-scale-renderer.ts'
import { parisMapStyle } from '../src/studies/paris-renderer-policy.ts'

test('regional airport infrastructure is independent of AIR and hidden during the heart morph', () => {
  expect(parisMapStyle.airports.independent).toBe(true)
  expect(parisMapStyle.airports.fog).toBe(false)
  const source = readFileSync('node_modules/@motionstudies/three/NationalNetworkScene.js', 'utf8')
  const transformed = transformParisScale(source)
  expect(() => parse(transformed, { sourceType: 'module' })).not.toThrow()
  expect(transformed).toContain('_jsx("group", { visible: (props.spatialLayoutMix ?? 0) === 0, children: props.airports?.map(')
  expect(() => transformParisScale(source.replace('props.airports?.map(', 'props.airports.map('))).toThrow('hook needs review')
})

test('only Paris label abbreviations rewrite the aircraft layer; public infrastructure prevents duplicates', () => {
  const source = readFileSync('node_modules/@motionstudies/three/AirTrafficLayer.js', 'utf8')
  const transformed = transformParisAirportLayer(source)
  expect(() => parse(transformed, { sourceType: 'module' })).not.toThrow()
  expect(transformed).toContain('!airportStyle?.independent && visibleAirports.map(')
  expect(transformed).toContain('const gap = name ? 17 : 0;')
  expect(() => transformParisAirportLayer(source.replace('const gap = 17;', 'const gap = 18;'))).toThrow('hook needs review')
})
