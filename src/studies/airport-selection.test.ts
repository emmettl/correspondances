import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MapTapGesture, pickAirportTarget } from './airport-selection.ts'
import { PARIS_AIRPORTS } from '../editions/paris-airports.ts'

const rect = { left: 90, top: 40, width: 800, height: 600 }
function setup() {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(44, rect.width / rect.height, 0.1, 120)
  camera.position.set(0, 20, 12); camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const screen = (x: number, y: number, z: number): [number, number] => {
    const p = new THREE.Vector3(x, y, z).project(camera)
    return [rect.left + (p.x * 0.5 + 0.5) * rect.width, rect.top + (0.5 - p.y * 0.5) * rect.height]
  }
  return { scene, camera, screen }
}

it('keeps airport click and touch targets generous across zoom and pan', () => {
  const { scene, camera, screen } = setup()
  const airport = PARIS_AIRPORTS[0], marker = new THREE.Group()
  marker.userData.parisAirport = airport
  scene.add(marker); scene.updateMatrixWorld()
  for (const height of [30, 10, 2]) {
    camera.position.set(1, height, height * 0.6); camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
    const [x, y] = screen(0, 0, 0)
    expect(pickAirportTarget(scene, camera, rect, x + 21, y, false)).toBe(airport)
    expect(pickAirportTarget(scene, camera, rect, x + 23, y, false)).toBeUndefined()
    expect(pickAirportTarget(scene, camera, rect, x + 27, y, true)).toBe(airport)
  }
  marker.visible = false
  expect(pickAirportTarget(scene, camera, rect, ...screen(0, 0, 0), false)).toBeUndefined()
})

it('makes the full visible airport label clickable and ignores hidden labels', () => {
  const { scene, camera, screen } = setup(), airport = PARIS_AIRPORTS[0]
  const label = new THREE.Sprite(new THREE.SpriteMaterial())
  label.userData.parisAirport = airport
  label.position.set(3, 1, 0); label.scale.set(5, 1, 1)
  scene.add(label); scene.updateMatrixWorld()
  const [x, y] = screen(4.5, 1, 0)
  expect(pickAirportTarget(scene, camera, rect, x, y, false)).toBe(airport)
  label.material.opacity = 0
  expect(pickAirportTarget(scene, camera, rect, x, y, false)).toBeUndefined()
})

describe('map tap gestures', () => {
  it('accepts a click but rejects a drag that returns to its start', () => {
    const gesture = new MapTapGesture()
    gesture.down(1, 10, 10)
    expect(gesture.up(1, 11, 10)).toBe(true)
    gesture.down(1, 10, 10)
    gesture.move(1, 30, 10)
    expect(gesture.up(1, 10, 10)).toBe(false)
  })
  it('rejects both pinch fingers, cancellation, and capture loss without poisoning the next tap', () => {
    const gesture = new MapTapGesture()
    gesture.down(1, 0, 0)
    gesture.down(2, 10, 0)
    expect(gesture.up(1, 0, 0)).toBe(false)
    expect(gesture.up(2, 10, 0)).toBe(false)
    gesture.down(3, 0, 0)
    expect(gesture.up(3, 0, 0, true)).toBe(false)
    expect(gesture.up(3, 0, 0)).toBe(false)
    gesture.down(4, 0, 0)
    expect(gesture.up(4, 0, 0)).toBe(true)
  })
})

it('ignores airports hidden by the heart layout, clips targets and prefers visible labels', () => {
  const { scene, camera, screen } = setup()
  const group = new THREE.Group(), marker = new THREE.Group()
  marker.userData.parisAirport = PARIS_AIRPORTS[0]
  group.add(marker); scene.add(group); scene.updateMatrixWorld()
  const point = screen(0, 0, 0)
  expect(pickAirportTarget(scene, camera, rect, ...point, false)).toBe(PARIS_AIRPORTS[0])
  group.visible = false
  expect(pickAirportTarget(scene, camera, rect, ...point, false)).toBeUndefined()
  group.visible = true
  expect(pickAirportTarget(scene, camera, rect, 0, 0, false)).toBeUndefined()
  const label = new THREE.Sprite(new THREE.SpriteMaterial())
  label.userData.parisAirport = PARIS_AIRPORTS[1]
  label.scale.set(4, 2, 1); scene.add(label); scene.updateMatrixWorld()
  expect(pickAirportTarget(scene, camera, rect, ...point, false)).toBe(PARIS_AIRPORTS[1])
  label.visible = false
  marker.position.set(0, 1000, 0); scene.updateMatrixWorld()
  expect(pickAirportTarget(scene, camera, rect, ...point, false)).toBeUndefined()
})
