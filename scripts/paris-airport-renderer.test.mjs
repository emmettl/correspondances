import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import { expect, test } from 'vitest'
import { transformParisAirportLayer } from './paris-airport-renderer.ts'
import { transformParisScale } from './paris-scale-renderer.ts'

test('regional airport landmarks render without AIR data and survive a heart round trip', () => {
  const source = transformParisScale(readFileSync('node_modules/@motionstudies/three/NationalNetworkScene.js', 'utf8'))
  let group
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'CallExpression' && node.callee.name === '_jsx' && node.arguments[0]?.value === 'group'
      && node.arguments[1]?.properties.some((property) => property.key.name === 'name' && property.value.value === 'paris-airport-landmarks')) group = node
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object') visit(value)
    }
  }
  visit(parse(source, { sourceType: 'module' }))
  expect(group).toBeDefined()
  const render = new Function('props', 'projection', 'AirportMarker', '_jsx', `return ${source.slice(group.start, group.end)}`)
  const airports = ['cdg', 'orly', 'le-bourget'].map((id) => ({ id }))
  for (const airSnapshot of [undefined, { tracks: [] }]) {
    for (const spatialLayoutMix of [0, 0.5, 1, 0.5, 0]) {
      const result = render({ airports, airSnapshot, spatialLayoutMix, selectedAirport: airports[0] }, {}, 'marker', (type, props) => ({ type, ...props }))
      expect(result.visible).toBe(spatialLayoutMix === 0)
      expect(result.children.map(({ airport }) => airport.id)).toEqual(['cdg', 'orly', 'le-bourget'])
      expect(result.children.map(({ selected }) => selected)).toEqual([true, false, false])
      expect(result.children.every(({ showLabel }) => showLabel)).toBe(true)
    }
  }
})

test('the pinned aircraft layer exposes its marker and does not render duplicates', () => {
  const source = readFileSync('node_modules/@motionstudies/three/AirTrafficLayer.js', 'utf8')
  const transformed = transformParisAirportLayer(source)
  expect(() => parse(transformed, { sourceType: 'module' })).not.toThrow()
  expect(transformed).toContain('export function AirportMarker(')
  expect(transformed).toContain('false && visibleAirports.map(')
  expect(() => transformParisAirportLayer(source.replace('function AirportMarker({', 'function RenamedMarker({'))).toThrow('hook needs review')
})
