import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import * as THREE from 'three'
import { mergeNetworkLayers } from '@motionstudies/core/domain/network-layers'
import { spatialLayoutCoverage } from '@motionstudies/core/domain/spatial-layout'
import { projectSpatialLayout } from '../node_modules/@motionstudies/three/spatial-layout.js'
import { prepareProjectedPath, pointAlongProjectedPath } from '../node_modules/@motionstudies/three/network-paths.js'
import { PARIS_HEART, parisHeartCoordinate, parisHeartFromWorld, buildParisHeartLayout, blendParisLayout } from '../src/editions/paris-layout.ts'
import { prepareParisGeometryMorph, updateParisGeometryMorph } from '../src/studies/use-paris-geometry-morph.ts'

const groups = ['', 'central-cross-', 'regional-rer-', 'metro-arcs-', 'metro-crossings-', 'metro-east-', 'metro-boulevards-', 'metro-west-', 'metro-local-', 'transilien-north-', 'transilien-saint-lazare-', 'transilien-southwest-', 'transilien-east-']
const read = (group, suffix) => JSON.parse(readFileSync(`fixtures/idfm/correspondances-${group}${suffix}.json`, 'utf8'))
const morning = groups.map(g => read(g, 'morning'))

test('the lens preserves radial order, direction and a finite regional envelope', () => {
  expect(parisHeartCoordinate(PARIS_HEART)).toEqual([0, 0])
  for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
    let previous = 0
    for (const distance of [0.001, 0.01, 0.03, 0.1, 0.3, 1, 2, 10]) {
      const coordinate = [PARIS_HEART[0] + Math.cos(angle) * distance, PARIS_HEART[1] + Math.sin(angle) * distance]
      const [x, y] = parisHeartCoordinate(coordinate)
      const radius = Math.hypot(x, y)
      expect(radius).toBeGreaterThan(previous)
      expect(radius).toBeLessThan(23)
      previous = radius
    }
  }
})

test('all 30 lines and full-day source paths are covered without changing service data', () => {
  const before = JSON.stringify(morning)
  const network = mergeNetworkLayers(morning)
  const layout = buildParisHeartLayout(network)
  expect(new Set(network.trains.map(t => t.route)).size).toBe(30)
  expect(spatialLayoutCoverage(network, layout)).toEqual({
    matchedStops: network.stops.length, totalStops: network.stops.length,
    matchedPaths: network.paths.length, totalPaths: network.paths.length,
  })
  for (const snapshot of [...morning, ...groups.map(g => ({ ...read(g, 'day-manifest'), trains: [] }))]) {
    const target = buildParisHeartLayout(snapshot)
    expect(target.paths.map(p => p.length)).toEqual(snapshot.paths.map(p => p.length))
    for (const p of target.paths.flat()) expect(p.every(Number.isFinite)).toBe(true)
    snapshot.stops.forEach((stop, index) => expect(target.stops[index].slice(1)).toEqual(parisHeartCoordinate(stop)))
  }
  expect(JSON.stringify(morning)).toBe(before)
})

test('rails, train paths and context agree throughout the morph and reuse the same buffers', () => {
  const network = morning[0]
  const b = network.bounds
  const projection = { centreLongitude: (b.minLongitude + b.maxLongitude) / 2, centreLatitude: (b.minLatitude + b.maxLatitude) / 2 }
  projection.longitudeScale = Math.cos(projection.centreLatitude * Math.PI / 180)
  projection.scale = 51 / ((b.maxLongitude - b.minLongitude) * projection.longitudeScale)
  const project = ([lon, lat]) => [(lon - projection.centreLongitude) * projection.longitudeScale * projection.scale, 0, -(lat - projection.centreLatitude) * projection.scale]
  const stops = network.stops.map(project)
  const paths = network.paths.map(path => prepareProjectedPath(path.map(project)))
  const alternate = projectSpatialLayout(network, buildParisHeartLayout(network), stops, paths)
  const index = paths.findIndex(p => p.points.length > 32)
  expect(index).toBeGreaterThanOrEqual(0)
  const geometry = new THREE.BufferGeometry().setFromPoints(paths[index].points.map(p => new THREE.Vector3(...p)))
  const attribute = geometry.getAttribute('position')
  const original = Array.from(attribute.array)
  const records = prepareParisGeometryMorph({ geometry }, projection)
  for (const mix of [0, 0.2, 0.5, 1, 0.7, 0]) {
    updateParisGeometryMorph(records, mix)
    const blended = blendParisLayout(stops, paths, alternate, mix)
    expect(blended.paths[index].points.length).toBe(paths[index].points.length)
    blended.paths[index].points.forEach((point, j) => point.forEach((v, axis) => expect(attribute.array[j * 3 + axis]).toBeCloseTo(v, 4)))
    // A moving train remains on a rendered segment, including long source paths.
    const trainPoint = pointAlongProjectedPath(blended.paths[index], 0.43)
    const distanceToSegment = (p, a, b) => {
      const segment = new THREE.Line3(new THREE.Vector3(...a), new THREE.Vector3(...b))
      const v = new THREE.Vector3(...p)
      return segment.closestPointToPoint(v, true, new THREE.Vector3()).distanceTo(v)
    }
    expect(Math.min(...blended.paths[index].points.slice(1).map((p, j) => distanceToSegment(trainPoint, blended.paths[index].points[j], p)))).toBeLessThan(1e-6)
    expect(geometry.getAttribute('position')).toBe(attribute)
  }
  expect(Array.from(attribute.array)).toEqual(original)
  stops.forEach((p, i) => {
    const [x, z] = parisHeartFromWorld(p[0], p[2], projection)
    expect(x).toBeCloseTo(alternate.stops[i][0], 8)
    expect(z).toBeCloseTo(alternate.stops[i][2], 8)
  })
  geometry.dispose()
})
