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
const audit = (await read('correspondances-transilien-audit.json')).data
const dayAudit = (await read('correspondances-transilien-day-audit.json')).data
const base = (await read('correspondances-morning.json')).data
const layers = []
const fullDay = []
for (const spec of [
  { slug: 'north', key: 'transilienNorth', routes: ['H', 'K'], morning: 116, day: 519, stops: 59, morningKiB: 40, manifestKiB: 24, chunkKiB: 16 },
  { slug: 'saint-lazare', key: 'transilienSaintLazare', routes: ['J', 'L'], morning: 187, day: 973, stops: 84, morningKiB: 80, manifestKiB: 52, chunkKiB: 28 },
  { slug: 'southwest', key: 'transilienSouthwest', routes: ['N', 'U', 'V'], morning: 91, day: 420, stops: 47, morningKiB: 36, manifestKiB: 24, chunkKiB: 16 },
  { slug: 'east', key: 'transilienEast', routes: ['P', 'R'], morning: 70, day: 357, stops: 56, morningKiB: 56, manifestKiB: 48, chunkKiB: 12 },
]) {
  const morning = await read(`correspondances-transilien-${spec.slug}-morning.json`)
  const day = await read(`correspondances-transilien-${spec.slug}-day-manifest.json`)
  for (const snapshot of [morning.data, day.data]) {
    assert.equal(snapshot.metadata.sourceSha256, base.metadata.sourceSha256)
    assert.equal(snapshot.metadata.sourceSha256, audit.metadata.sourceSha256)
    assert.equal(snapshot.metadata.sourceSha256, dayAudit.metadata.sourceSha256)
    assert.equal(snapshot.metadata.serviceDate, base.metadata.serviceDate)
    assert.equal(snapshot.metadata.license, base.metadata.license)
    assert.deepEqual(snapshot.metadata.localRouteIds, audit.candidateLayers[spec.key].routeIds)
    assert.deepEqual(snapshot.metadata.modes, ['rail'])
    assert.equal(snapshot.stops.length, spec.stops)
  }
  assert.equal(morning.data.metadata.windowStart, 25200)
  assert.equal(morning.data.metadata.windowEnd, 32400)
  assert.equal(morning.data.metadata.focusTime, 28800)
  assert.equal(morning.data.trains.length, spec.morning)
  assert.equal(morning.data.trains.length, audit.candidateLayers[spec.key].tripCount)
  assert.equal(day.data.tripCount, dayAudit.candidateLayers[spec.key].tripCount)
  assert.equal(day.data.tripCount, spec.day)
  assert.equal(day.data.metadata.windowStart, 0)
  assert.equal(day.data.metadata.windowEnd, 86400)
  assert.ok(morning.gzip < spec.morningKiB * 1024)
  assert.ok(day.gzip < spec.manifestKiB * 1024)
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
    assert.ok(chunk.gzip < spec.chunkKiB * 1024)
    largestChunk = Math.max(largestChunk, chunk.gzip)
    const snapshot = networkSnapshotForDayChunk(day.data, chunk.data)
    for (const train of snapshot.trains) {
      trains.set(train.id, train)
      assert.equal(train.category, 'regional')
      assert.equal(train.mode, 'rail')
      assert.ok(train.shortName.length > 0)
      assert.ok(train.stops.every(([index]) => snapshot.stops[index]))
      assert.equal(train.pathSegments.length, train.stops.length - 1)
      assert.ok(train.pathSegments.every((index) => snapshot.paths[index]?.length >= 2))
      assert.ok(train.start <= descriptor.windowEnd && train.end >= descriptor.windowStart)
    }
  }
  assert.equal(previousEnd, 86400)
  assert.equal(trains.size, spec.day)
  assert.ok(morning.data.trains.every((train) => trains.has(train.id)))
  for (const line of spec.routes) {
    const name = `Transilien ${line}`
    assert.equal(morning.data.trains.filter((train) => train.route === name).length, audit.routes.find((route) => route.name === name).tripCount)
    assert.equal([...trains.values()].filter((train) => train.route === name).length, dayAudit.routes.find((route) => route.name === name).tripCount)
  }
  layers.push(morning.data)
  fullDay.push({ ...day.data, trains: [...trains.values()] })
  console.log(`Transilien ${spec.slug}: ${spec.morning} morning / ${spec.day} day; ${(morning.gzip / 1024).toFixed(1)} KiB morning, ${(day.gzip / 1024).toFixed(1)} KiB manifest, ${(largestChunk / 1024).toFixed(1)} KiB largest chunk.`)
}
// Preserve radial branches and the U/V links that bypass central Paris.
for (const [line, termini] of [
  ['H', ['Gare du Nord', 'Pontoise', 'Luzarches', 'Persan - Beaumont', 'Creil']],
  ['K', ['Gare du Nord', 'Crépy-en-Valois']],
  ['J', ['Gare Saint-Lazare', 'Gisors', 'Vernon - Giverny', 'Mantes-la-Jolie', 'Ermont - Eaubonne']],
  ['L', ['Gare Saint-Lazare', 'Cergy le Haut', 'Versailles Rive Droite', 'Saint-Nom-la-Bretèche - Forêt de Marly']],
  ['N', ['Gare Montparnasse', 'Dreux', 'Rambouillet', 'Mantes-la-Jolie']],
  ['U', ['La Défense', 'La Verrière']],
  ['V', ['Massy - Palaiseau', 'Versailles Chantiers']],
  ['P', ["Gare de l'Est", 'Coulommiers', 'Provins', 'Château-Thierry', 'La Ferté-Milon']],
  ['R', ['Gare de Lyon', 'Montargis', 'Montereau', 'Melun']],
]) {
  const destinations = new Set(fullDay.flatMap((layer) => layer.trains.filter((train) => train.route === `Transilien ${line}`).map((train) => train.headsign)))
  for (const terminus of termini) assert.ok(destinations.has(terminus), `${line} missing branch to ${terminus}`)
}
const transilien = mergeNetworkLayers(layers)
assert.equal(transilien.trains.length, 464)
assert.equal(new Set(transilien.trains.map((train) => train.route)).size, 9)
assert.equal(transilien.trains.filter((train) => train.start <= 28800 && train.end >= 28800).length, 134)
const existing = await Promise.all(['central-cross', 'regional-rer', 'metro-arcs', 'metro-crossings', 'metro-east', 'metro-boulevards', 'metro-west', 'metro-local'].map(async (slug) => (await read(`correspondances-${slug}-morning.json`)).data))
const merged = mergeNetworkLayers([base, ...existing, ...layers])
assert.equal(merged.trains.length, 2967)
assert.equal(new Set(merged.trains.map((train) => train.id)).size, 2967)
assert.equal(new Set(merged.trains.map((train) => train.route)).size, 30)
assert.equal(merged.trains.filter((train) => train.start <= 28800 && train.end >= 28800).length, 860)
assert.deepEqual([...new Set(layers.flatMap((layer) => layer.metadata.localRouteIds))].sort(), audit.routes.map((route) => route.id).sort())
console.log('Complete 30-line composition: 2967 morning journeys, 860 active at 08:00; all nine Transilien lines match independent morning/day audits.')
