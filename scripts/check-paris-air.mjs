import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const directory = 'fixtures/adsb/'
const read = async (name) => JSON.parse(await readFile(directory + name, 'utf8'))
const morning = await read('correspondances-air-morning.json')
const day = await read('correspondances-air-day-manifest.json')
const airports = await read('correspondances-airports.json')
for (const snapshot of [morning, day]) {
  assert.equal(snapshot.metadata.publisher, 'ADSB.lol')
  assert.equal(snapshot.metadata.serviceDate, '2026-09-04')
  assert.equal(snapshot.metadata.timezone, 'Europe/Paris')
  assert.equal(snapshot.metadata.utcOffsetHours, 2)
  assert.equal(snapshot.metadata.license, 'ODbL 1.0')
  assert.equal(snapshot.metadata.sampleIntervalSeconds, 10)
  assert.equal(snapshot.metadata.sourceFiles.length, 48)
  assert(snapshot.metadata.sourceFiles.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)))
  assert.deepEqual(snapshot.bounds, { minLongitude: 1.5, minLatitude: 48.3, maxLongitude: 3.4, maxLatitude: 49.35 })
}
assert.equal(morning.metadata.windowStart, 25_200)
assert.equal(morning.metadata.windowEnd, 32_400)
assert(morning.tracks.length > 400)
assert.equal(day.metadata.windowStart, 0)
assert.equal(day.metadata.windowEnd, 86_400)
assert.equal(day.chunks.length, 12)
assert(day.trackCount > 4_000)
assert.equal(day.aircraft.length, day.trackCount)
const index = new Map(day.aircraft.map((track) => [track.id, track]))
assert.equal(index.size, day.trackCount)
function validateTracks(tracks, start, end) {
  assert.equal(new Set(tracks.map((track) => track.id)).size, tracks.length)
  for (const track of tracks) {
    assert(track.samples.length >= 2)
    assert.equal(track.start, track.samples[0][0])
    assert.equal(track.end, track.samples.at(-1)[0])
    assert(track.start >= start && track.end <= end)
    let previous = -Infinity
    for (const sample of track.samples) {
      assert.equal(sample.length, 5)
      assert(sample.every(Number.isFinite))
      assert(sample[0] > previous)
      assert(sample[1] >= 1.5 && sample[1] <= 3.4 && sample[2] >= 48.3 && sample[2] <= 49.35)
      assert(sample[3] >= 0 && sample[4] >= 0)
      previous = sample[0]
    }
  }
}
validateTracks(morning.tracks, 25_200, 32_400)
let largestChunk = 0
let totalChunks = 0
for (const [position, descriptor] of day.chunks.entries()) {
  assert.equal(descriptor.windowStart, position * 7_200)
  assert.equal(descriptor.windowEnd, (position + 1) * 7_200)
  assert.match(descriptor.path, /^correspondances-air-day-\d{2}\.json$/)
  const bytes = await readFile(directory + descriptor.path)
  assert.equal(bytes.length, descriptor.bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), descriptor.sha256)
  const chunk = JSON.parse(bytes)
  assert.equal(chunk.windowStart, descriptor.windowStart)
  assert.equal(chunk.windowEnd, descriptor.windowEnd)
  assert.equal(chunk.tracks.length, descriptor.trackCount)
  assert.equal(chunk.tracks.reduce((sum, track) => sum + track.samples.length, 0), descriptor.sampleCount)
  validateTracks(chunk.tracks, Math.max(0, chunk.windowStart - 180), Math.min(86_400, chunk.windowEnd + 45))
  for (const track of chunk.tracks) {
    assert(index.has(track.id))
    assert.deepEqual(track.origin, index.get(track.id).origin)
    assert.deepEqual(track.destination, index.get(track.id).destination)
  }
  const gzip = gzipSync(bytes, { level: 9 }).length
  assert(gzip <= 420 * 1024, `${descriptor.path} exceeds its lazy-chunk budget`)
  largestChunk = Math.max(largestChunk, gzip)
  totalChunks += gzip
}
for (const track of day.aircraft) {
  assert(track.chunkIds.length > 0)
  for (const id of track.chunkIds) assert(day.chunks.some((chunk) => chunk.id === id))
}
const morningGzip = gzipSync(await readFile(directory + 'correspondances-air-morning.json'), { level: 9 }).length
const manifestGzip = gzipSync(await readFile(directory + 'correspondances-air-day-manifest.json'), { level: 9 }).length
assert(morningGzip <= 350 * 1024)
// Full-day origin/destination evidence increases this index to ~157 KiB.
assert(manifestGzip <= 175 * 1024)
assert(totalChunks <= 3_200 * 1024)
assert.deepEqual(airports.map((airport) => airport.icao).sort(), ['LFPB', 'LFPG', 'LFPO'])
for (const airport of airports) {
  assert(airport.latitude >= 48.3 && airport.latitude <= 49.35)
  assert(airport.longitude >= 1.5 && airport.longitude <= 3.4)
}
console.log(`Paris AIR: ${morning.tracks.length} morning segments / ${(morningGzip / 1024).toFixed(1)} KiB gzip; ${day.trackCount} day segments / ${day.chunks.length} lazy chunks.`)
console.log(`AIR day: ${(manifestGzip / 1024).toFixed(1)} KiB manifest; ${(largestChunk / 1024).toFixed(1)} KiB largest chunk; ${(totalChunks / 1024).toFixed(1)} KiB all chunks.`)
