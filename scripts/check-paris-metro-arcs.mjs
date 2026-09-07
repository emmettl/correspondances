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
const base = (await read('correspondances-morning.json')).data
const audit = (await read('correspondances-scope-audit.json')).data
const morning = await read('correspondances-metro-arcs-morning.json')
const day = await read('correspondances-metro-arcs-day-manifest.json')
for (const snapshot of [morning.data, day.data]) {
  assert.equal(snapshot.metadata.sourceSha256, base.metadata.sourceSha256)
  assert.equal(snapshot.metadata.serviceDate, base.metadata.serviceDate)
  assert.equal(snapshot.metadata.license, base.metadata.license)
  assert.deepEqual(snapshot.metadata.localRouteIds, audit.candidateLayers.metroArcs.routeIds)
  assert.deepEqual(snapshot.metadata.modes, ['subway'])
  assert.equal(snapshot.stops.length, 106)
}
assert.equal(morning.data.metadata.windowStart, 25_200)
assert.equal(morning.data.metadata.windowEnd, 32_400)
assert.equal(morning.data.metadata.focusTime, 28_800)
assert.equal(morning.data.trains.length, audit.candidateLayers.metroArcs.tripCount)
assert.equal(morning.data.trains.length, 248)
assert.deepEqual([...new Set(morning.data.trains.map((train) => train.route))].sort(), ['Métro 2', 'Métro 6'])
assert.ok(morning.gzip < 64 * 1024, 'Morning arcs exceed 64 KiB gzip')
assert.ok(day.gzip < 16 * 1024, 'Arcs manifest exceeds 16 KiB gzip')
assert.equal(day.data.metadata.windowStart, 0)
assert.equal(day.data.metadata.windowEnd, 86_400)
assert.equal(day.data.tripCount, 1495)
assert.equal(day.data.chunks.length, 12)
const ids = new Set()
let largestChunk = 0
let previousEnd = 0
for (const descriptor of day.data.chunks) {
  const chunk = await read(descriptor.path)
  assert.equal(descriptor.windowStart, previousEnd)
  previousEnd = descriptor.windowEnd
  assert.equal(chunk.data.windowStart, descriptor.windowStart)
  assert.equal(chunk.data.windowEnd, descriptor.windowEnd)
  assert.equal(chunk.data.trains.length, descriptor.tripCount)
  assert.equal(chunk.bytes.length, descriptor.bytes)
  assert.equal(createHash('sha256').update(chunk.bytes).digest('hex'), descriptor.sha256)
  assert.ok(chunk.gzip < 52 * 1024, `${descriptor.id} exceeds 52 KiB gzip`)
  largestChunk = Math.max(largestChunk, chunk.gzip)
  const snapshot = networkSnapshotForDayChunk(day.data, chunk.data)
  for (const train of snapshot.trains) {
    ids.add(train.id)
    assert.ok(train.stops.every(([index]) => snapshot.stops[index]))
    assert.ok(train.pathSegments.every((index) => snapshot.paths[index]))
    assert.ok(train.start <= descriptor.windowEnd && train.end >= descriptor.windowStart)
  }
}
assert.equal(previousEnd, 86_400)
assert.equal(ids.size, day.data.tripCount)
assert.ok(morning.data.trains.every((train) => ids.has(train.id)))
const merged = mergeNetworkLayers([
  base,
  (await read('correspondances-central-cross-morning.json')).data,
  (await read('correspondances-regional-rer-morning.json')).data,
  morning.data,
])
assert.equal(merged.trains.length, 1225)
assert.equal(new Set(merged.trains.map((train) => train.route)).size, 10)
assert.equal(merged.trains.filter((train) => train.start <= 28_800 && train.end >= 28_800).length, 397)
console.log(`Métro arcs: 248 morning / 1495 daily journeys; ${(morning.gzip / 1024).toFixed(1)} KiB morning, ${(day.gzip / 1024).toFixed(1)} KiB manifest, ${(largestChunk / 1024).toFixed(1)} KiB largest chunk; ten-line composition verified.`)
