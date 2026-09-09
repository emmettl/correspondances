import type { NetworkTrain } from '@motionstudies/core/domain/network'

/** Build once per immutable selection; clock updates need only two binary searches. */
export function createActiveTimetableVehicleCounter(trains: readonly NetworkTrain[]): (time: number) => number {
  const starts: number[] = [], ends: number[] = []
  for (const train of trains) {
    if (train.realtime?.status === 'cancelled' || !(train.start <= train.end)) continue
    starts.push(train.start)
    ends.push(train.end)
  }
  starts.sort((a, b) => a - b)
  ends.sort((a, b) => a - b)
  const before = (values: readonly number[], time: number, inclusive: boolean): number => {
    let low = 0, high = values.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (values[middle] < time || inclusive && values[middle] === time) low = middle + 1
      else high = middle
    }
    return low
  }
  // Include both departure and arrival instants, including zero-length trips.
  return time => before(starts, time, true) - before(ends, time, false)
}
