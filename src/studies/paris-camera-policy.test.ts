import { expect, test } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { createParisCameraDriver } from './paris-camera-policy.ts'
import { parisHeartFromWorld } from '../editions/paris-layout.ts'

const projection = { centreLongitude: 2.347, centreLatitude: 48.861, longitudeScale: 0.65, scale: 100 }
const context = () => ({ camera: new PerspectiveCamera(), target: new Vector3(), projection })

function frame(driver: ReturnType<typeof createParisCameraDriver>, stops: readonly (readonly [number, number, number])[], mix: number) {
  const target = new Vector3(90, 0, 90)
  driver.prepareFrame!(target, stops, mix, 0, false)
  return target
}

test('geographic focus follows a reversing morph and a direct gesture releases it', () => {
  const driver = createParisCameraDriver(context(), { matches: false })
  const focus = [2 / (projection.longitudeScale * projection.scale) + projection.centreLongitude, 3 / projection.scale + projection.centreLatitude] as const
  driver.onCommand!({ id: 1, action: 'focus-location', focus }, undefined, new Vector3(2, 0, -3))
  const x = 2, z = -3, [heartX, heartZ] = parisHeartFromWorld(x, z, projection)
  for (const mix of [0, 0.7, 1, 0.2, 0]) expect(frame(driver, [], mix).toArray()).toEqual([x + (heartX - x) * mix, 0, z + (heartZ - z) * mix])
  driver.onGesture!()
  expect(frame(driver, [], 1).toArray()).toEqual([90, 0, 90])
  driver.onCommand!({ id: 2, action: 'focus-road', focus }, undefined, new Vector3())
  expect(frame(driver, [], 1).toArray()).toEqual([90, 0, 90])
})

test('station focus follows current stop positions in place and retires on retarget/disposal', () => {
  const driver = createParisCameraDriver(context(), { matches: false })
  const station = { name: 'Hub', trainIds: [], routes: [], stopIndexes: [0, 1] }
  driver.onCommand!({ id: 1, action: 'reveal-station' }, station, new Vector3())
  expect(frame(driver, [[2, 0, 4], [6, 0, 8]], 0).toArray()).toEqual([4, 0, 6])
  expect(frame(driver, [[12, 0, 4], [16, 0, 8]], 1).toArray()).toEqual([14, 0, 6])
  driver.onCommand!({ id: 2, action: 'zoom-in' }, station, new Vector3())
  expect(frame(driver, [], 1).toArray()).toEqual([90, 0, 90])
  driver.onCommand!({ id: 3, action: 'reveal-station' }, station, new Vector3())
  driver.dispose()
  expect(frame(driver, [], 1).toArray()).toEqual([90, 0, 90])
  expect(driver.update(1)).toBe(false)
})

test('authored damping expires, yields to vehicle following and gestures, and reads live reduced motion', () => {
  const motion = { matches: false }, driver = createParisCameraDriver(context(), motion)
  const target = new Vector3()
  const damping = (delta: number, following = false) => driver.prepareFrame!(target, [], 0, delta, following)
  driver.onCommand!({ id: 1, action: 'reset' }, undefined, new Vector3())
  expect(damping(0.2)).toBeCloseTo(1 - Math.exp(-0.2 * 3.2))
  expect(damping(0.2, true)).toBeUndefined()
  expect(damping(2)).toBeUndefined()
  driver.onCommand!({ id: 2, action: 'focus-location' }, undefined, new Vector3())
  driver.onGesture!()
  expect(damping(0.2)).toBeUndefined()
  motion.matches = true
  expect(damping(0, true)).toBe(1)
  motion.matches = false
  expect(damping(0.2)).toBeUndefined()
})
