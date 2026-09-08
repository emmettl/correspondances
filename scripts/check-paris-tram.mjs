import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { networkSnapshotForDayChunk } from '@motionstudies/core/domain/network-day'
import { mergeNetworkLayers } from '@motionstudies/core/domain/network-layers'

const read = async (file) => {
  const bytes = await readFile(`fixtures/idfm/${file}`)
  return { bytes, data: JSON.parse(bytes), gzip: gzipSync(bytes, { level: 9 }).length }
}
const morning = await read('correspondances-tram-marechaux-morning.json')
const day = await read('correspondances-tram-marechaux-day-manifest.json')
const audit = (await read('correspondances-tram-audit.json')).data
const dayAudit = (await read('correspondances-tram-day-audit.json')).data
const base = (await read('correspondances-morning.json')).data
for (const [snapshot, sourceAudit, start, end] of [
  [morning.data, audit, 25200, 32400], [day.data, dayAudit, 0, 86400],
]) {
  for (const metadata of [snapshot.metadata, sourceAudit.metadata]) {
    assert.equal(metadata.sourceSha256, base.metadata.sourceSha256)
    assert.equal(metadata.serviceDate, base.metadata.serviceDate)
    assert.equal(metadata.retrievedAt, base.metadata.retrievedAt)
    assert.equal(metadata.windowStart, start)
    assert.equal(metadata.windowEnd, end)
  }
  assert.equal(snapshot.metadata.license, base.metadata.license)
  assert.deepEqual(snapshot.metadata.modes, ['tram'])
  assert.deepEqual(snapshot.metadata.localRouteIds, sourceAudit.candidateLayers.tramMarechaux.routeIds)
  assert.equal(snapshot.stops.length, 116)
  assert.equal(snapshot.metadata.geometry.matchedSegments, snapshot.paths.length)
  assert.equal(snapshot.metadata.geometry.totalSegments, snapshot.paths.length)
}
assert.equal(morning.data.metadata.focusTime, 28800)
assert.equal(morning.data.trains.length, 174)
assert.equal(morning.data.trains.length, audit.candidateLayers.tramMarechaux.tripCount)
assert.equal(day.data.tripCount, 941)
assert.equal(day.data.tripCount, dayAudit.candidateLayers.tramMarechaux.tripCount)
assert.ok(morning.gzip < 48 * 1024)
assert.ok(day.gzip < 16 * 1024)
assert.equal(day.data.chunks.length, 12)
const trains = new Map()
let previousEnd = 0
let largestChunk = 0
for (const descriptor of day.data.chunks) {
  const chunk = await read(descriptor.path)
  assert.equal(descriptor.windowStart, previousEnd)
  previousEnd = descriptor.windowEnd
  assert.equal(chunk.data.windowStart, descriptor.windowStart)
  assert.equal(chunk.data.windowEnd, descriptor.windowEnd)
  assert.equal(chunk.data.trains.length, descriptor.tripCount)
  assert.equal(chunk.bytes.length, descriptor.bytes)
  assert.equal(createHash('sha256').update(chunk.bytes).digest('hex'), descriptor.sha256)
  assert.ok(chunk.gzip < 36 * 1024)
  largestChunk = Math.max(largestChunk, chunk.gzip)
  const snapshot = networkSnapshotForDayChunk(day.data, chunk.data)
  for (const train of snapshot.trains) {
    if (trains.has(train.id)) assert.deepEqual(train, trains.get(train.id))
    trains.set(train.id, train)
    assert.equal(train.category, 'tram')
    assert.equal(train.mode, 'tram')
    assert.ok(train.stops.every(([index, arrival, departure]) => snapshot.stops[index] && Number.isFinite(arrival) && departure >= arrival))
    assert.equal(train.pathSegments.length, train.stops.length - 1)
    assert.ok(train.pathSegments.every((index) => snapshot.paths[index]?.length >= 2))
    assert.ok(train.start <= descriptor.windowEnd && train.end >= descriptor.windowStart)
  }
}
assert.equal(previousEnd, 86400)
assert.equal(trains.size, 941)
assert.deepEqual(morning.data.trains.map((train) => train.id).sort(), [...trains.values()].filter((train) => train.start <= 32400 && train.end >= 25200).map((train) => train.id).sort())
for (const [line, termini] of [
  ['Tram T3a', ['Pont du Garigliano', 'Porte de Vincennes']],
  ['Tram T3b', ['Porte Dauphine (Avenue Foch)', 'Porte de Vincennes']],
]) {
  const services = [...trains.values()].filter((train) => train.route === line)
  assert.equal(services.length, dayAudit.routes.find((route) => route.name === line).tripCount)
  assert.equal(morning.data.trains.filter((train) => train.route === line).length, audit.routes.find((route) => route.name === line).tripCount)
  const destinations = new Set(services.map((train) => train.headsign))
  for (const terminus of termini) assert.ok(destinations.has(terminus), `${line} missing ${terminus}`)
  // Each published trip belongs to one line; no connection closes the western gap.
  for (const train of services) assert.notEqual(day.data.stops[train.stops[0][0]][2], train.headsign)
}
const existing = await Promise.all(['central-cross', 'regional-rer', 'metro-arcs', 'metro-crossings', 'metro-east', 'metro-boulevards', 'metro-west', 'metro-local', 'transilien-north', 'transilien-saint-lazare', 'transilien-southwest', 'transilien-east'].map(async (slug) => (await read(`correspondances-${slug}-morning.json`)).data))
const merged = mergeNetworkLayers([base, ...existing, morning.data])
assert.equal(merged.trains.length, 3141)
assert.equal(new Set(merged.trains.map((train) => train.id)).size, 3141)
assert.equal(new Set(merged.trains.map((train) => train.route)).size, 32)
assert.equal(morning.data.trains.filter((train) => train.start <= 28800 && train.end >= 28800).length, 57)
assert.equal(merged.trains.filter((train) => train.start <= 28800 && train.end >= 28800).length, 917)
console.log(`Tram T3a/T3b: 174 morning / 941 day journeys; ${(morning.gzip / 1024).toFixed(1)} KiB morning, ${(day.gzip / 1024).toFixed(1)} KiB manifest, ${(largestChunk / 1024).toFixed(1)} KiB largest chunk.`)
console.log('Complete 32-line composition: 3141 morning journeys, 917 active at 08:00; source counts, termini and progressive chunks verified.')
