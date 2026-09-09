import { expect, it } from 'vitest'
import type { NetworkSnapshot, NetworkTrain } from '@motionstudies/core/domain/network'
import opening from '../../fixtures/idfm/correspondances-morning.json'
import rer from '../../fixtures/idfm/correspondances-regional-rer-morning.json'
import tram from '../../fixtures/idfm/correspondances-tram-marechaux-morning.json'
import { createActiveTimetableVehicleCounter } from './vehicle-counts.ts'

it('matches the existing count through real Paris timetable boundaries and filtered selections', () => {
  for (const data of [opening, rer, tram]) {
    const snapshot = data as unknown as NetworkSnapshot
    for (const trains of [snapshot.trains, snapshot.trains.filter(train => train.route === snapshot.trains[0].route)]) {
      const count = createActiveTimetableVehicleCounter(trains)
      const times = new Set(trains.flatMap(train => [train.start - 0.01, train.start, train.end, train.end + 0.01]))
      for (const time of [...times].reverse()) {
        expect(count(time)).toBe(trains.filter(train => train.realtime?.status !== 'cancelled' && time >= train.start && time <= train.end).length)
      }
    }
  }
})

it('retains inclusive endpoints and handles cancellation, empty selections and zero-length trips', () => {
  const train: NetworkTrain = { id: 'test', route: 'R', shortName: 'R', headsign: '', category: 'regional', start: 10, end: 10, stops: [] }
  const count = createActiveTimetableVehicleCounter([train, { ...train, realtime: { status: 'cancelled', delaySeconds: 0, skippedStops: 0, generatedAt: '' } }])
  expect([count(9), count(10), count(11), count(NaN)]).toEqual([0, 1, 0, 0])
  expect(createActiveTimetableVehicleCounter([])(10)).toBe(0)
})
