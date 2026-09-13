import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import { expect, test } from 'vitest'
import { transformParisAirportLayer } from './paris-airport-renderer.ts'
import { parisAirportLandmarks, parisMapStyle } from '../src/studies/paris-renderer-policy.ts'

test('regional airport infrastructure is independent of AIR and hidden during the heart morph', () => {
  const airports = ['cdg', 'orly', 'le-bourget'].map(id => ({ id }))
  expect(parisMapStyle.airports.independent).toBe(true)
  expect(parisMapStyle.airports.fog).toBe(false)
  for (const mix of [0, 0.5, 1, 0.5, 0]) {
    expect(parisAirportLandmarks(airports, mix)).toEqual(mix === 0 ? airports : undefined)
  }
  expect(parisAirportLandmarks(undefined)).toBeUndefined()
})

test('only Paris label abbreviations rewrite the aircraft layer; public infrastructure prevents duplicates', () => {
  const source = readFileSync('node_modules/@motionstudies/three/AirTrafficLayer.js', 'utf8')
  const transformed = transformParisAirportLayer(source)
  expect(() => parse(transformed, { sourceType: 'module' })).not.toThrow()
  expect(transformed).toContain('!airportStyle?.independent && visibleAirports.map(')
  expect(transformed).toContain('const gap = name ? 17 : 0;')
  expect(() => transformParisAirportLayer(source.replace('const gap = 17;', 'const gap = 18;'))).toThrow('hook needs review')
})
