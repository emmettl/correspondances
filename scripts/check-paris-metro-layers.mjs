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
const layers = []
for (const spec of [
  { slug: 'metro-arcs', auditKey: 'metroArcs', routes: ['Métro 2', 'Métro 6'], stops: 106, morningTrips: 248, dayTrips: 1495, morningKiB: 64, chunkKiB: 52 },
  { slug: 'metro-east', auditKey: 'metroEast', routes: ['Métro 3', 'Métro 11'], stops: 88, morningTrips: 261, dayTrips: 1494, morningKiB: 64, chunkKiB: 52 },
  { slug: 'metro-crossings', auditKey: 'metroCrossings', routes: ['Métro 5', 'Métro 7'], stops: 120, morningTrips: 291, dayTrips: 1573, morningKiB: 80, chunkKiB: 64 },
]) {
  const morning = await read(`correspondances-${spec.slug}-morning.json`)
  const day = await read(`correspondances-${spec.slug}-day-manifest.json`)
  for (const snapshot of [morning.data, day.data]) {
    assert.equal(snapshot.metadata.sourceSha256, base.metadata.sourceSha256)
    assert.equal(snapshot.metadata.serviceDate, base.metadata.serviceDate)
    assert.equal(snapshot.metadata.license, base.metadata.license)
    assert.deepEqual(snapshot.metadata.localRouteIds, audit.candidateLayers[spec.auditKey].routeIds)
    assert.deepEqual(snapshot.metadata.modes, ['subway'])
    assert.equal(snapshot.stops.length, spec.stops)
  }
  assert.equal(morning.data.metadata.windowStart, 25_200)
  assert.equal(morning.data.metadata.windowEnd, 32_400)
  assert.equal(morning.data.metadata.focusTime, 28_800)
  assert.equal(morning.data.trains.length, audit.candidateLayers[spec.auditKey].tripCount)
  assert.equal(morning.data.trains.length, spec.morningTrips)
  assert.deepEqual([...new Set(morning.data.trains.map((train) => train.route))].sort(), [...spec.routes].sort())
  assert.ok(morning.gzip < spec.morningKiB * 1024, `${spec.slug} morning exceeds its gzip gate`)
  assert.ok(day.gzip < 16 * 1024, 'Métro layer manifest exceeds 16 KiB gzip')
  assert.equal(day.data.metadata.windowStart, 0)
  assert.equal(day.data.metadata.windowEnd, 86_400)
  assert.equal(day.data.tripCount, spec.dayTrips)
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
    assert.ok(chunk.gzip < spec.chunkKiB * 1024, `${spec.slug}/${descriptor.id} exceeds its gzip gate`)
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
  layers.push(morning.data)
  if (spec.slug === 'metro-east') {
    for (const [route, termini] of [['Métro 3', ['Gallieni', 'Pont de Levallois - Bécon']], ['Métro 11', ['Châtelet', 'Rosny-Bois-Perrier']]]) {
      const destinations = new Set(morning.data.trains.filter((train) => train.route === route).map((train) => train.headsign))
      assert.deepEqual([...destinations].sort(), termini.sort())
    }
  }
  if (spec.slug === 'metro-crossings') {
    const destinations = new Set(morning.data.trains.filter((train) => train.route === 'Métro 7').map((train) => train.headsign))
    assert.ok(destinations.has('Villejuif - Louis Aragon'))
    assert.ok(destinations.has("Mairie d'Ivry"))
  }
  console.log(`${spec.slug}: ${spec.morningTrips} morning / ${spec.dayTrips} day journeys; ${(morning.gzip / 1024).toFixed(1)} KiB morning, ${(day.gzip / 1024).toFixed(1)} KiB manifest, ${(largestChunk / 1024).toFixed(1)} KiB largest chunk.`)
}
const merged = mergeNetworkLayers([
  base,
  (await read('correspondances-central-cross-morning.json')).data,
  (await read('correspondances-regional-rer-morning.json')).data,
  ...layers,
])
assert.equal(merged.trains.length, 1777)
assert.equal(new Set(merged.trains.map((train) => train.route)).size, 14)
assert.equal(merged.trains.filter((train) => train.start <= 28_800 && train.end >= 28_800).length, 538)
console.log('Fourteen-line composition verified: 1777 morning journeys and 538 vehicles active at 08:00.')
