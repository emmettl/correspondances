import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import { expect, test } from 'vitest'
import * as THREE from 'three'
import * as stationLabels from '../node_modules/@motionstudies/three/station-labels.js'
import * as parisLabels from '../src/editions/paris-station-labels.ts'
import * as mapCamera from '../node_modules/@motionstudies/three/map-camera.js'
import { parisHeartFromWorld } from '../src/editions/paris-layout.ts'
import { pickAirportTarget } from '../src/studies/airport-selection.ts'
import { transformParisScale } from './paris-scale-renderer.ts'
import { parisOverviewMix, parisTrainLabelBudget, parisStationLabelHeight } from '../src/editions/paris-scale.ts'

const renderer = readFileSync('node_modules/@motionstudies/three/NationalNetworkScene.js', 'utf8')

test('Paris density hooks fit the pinned renderer and reject changed upstream hooks', () => {
  expect(() => parse(transformParisScale(renderer), { sourceType: 'module' })).not.toThrow()
  expect(() => transformParisScale(renderer.replace('const lastCommand = useRef(0);', 'const lastCommand = useRef(-1);'))).toThrow('hook needs review')
  for (const hook of ['const rankLimit = stationLabelRankLimit(semanticHeight);', 'stationLabelWithinTier(label.station.labelRank, tierLimit)']) {
    expect(() => transformParisScale(renderer.replace(hook, 'changedHook'))).toThrow('hook needs review')
  }
})

test.each([
  ["Gare d'Austerlitz", 37],
  ['Unlisted local stop', 14.9],
])('visible station %s remains selectable beyond the old global cutoff', (name, height) => {
  const source = transformParisScale(renderer)
  const node = parse(source, { sourceType: 'module' }).program.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'StationTapTarget')
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100)
  camera.position.set(0, height, 0)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const handlers = new Map()
  const element = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener() {},
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }),
  }
  const target = { name, labelRank: 3, trainIds: [], routes: [], stopIndexes: [] }
  const stations = [...Array.from({ length: 100 }, (_, index) => ({ ...target, name: `Other ${index}`, labelRank: 1 })), target]
  let selected
  const scope = {
    ...stationLabels, ...parisLabels, parisStationLabelHeight, THREE, pickAirportTarget,
    useThree: () => ({ camera, gl: { domElement: element }, scene: new THREE.Scene() }),
    useMemo: (factory) => factory(),
    useEffect: (setup) => setup(),
    stationCentre: (station) => new THREE.Vector3(station === target ? 0 : 1000, 0, 0),
  }
  // Execute the actual transformed pointer handler, with only React lifecycle
  // and world positions supplied by the test. This catches cutoff/index drift.
  const tapTarget = new Function(...Object.keys(scope), `return (${source.slice(node.start, node.end)})`)(...Object.values(scope))
  tapTarget({ stations, projectedStops: [], cameraFraming: {}, onSelectStation: (station) => { selected = station } })
  const event = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 500, clientY: 500 }
  handlers.get('pointerdown')(event)
  handlers.get('pointerup')(event)
  expect(selected).toBe(target)
})

test('city scale keeps missions quiet, with bounded closer inspection on phone and desktop', () => {
  for (const width of [390, 1440]) {
    expect(parisStationLabelHeight(width, false, 3, 5)).toBeLessThan(parisStationLabelHeight(width, false, 3, 20))
    expect(parisStationLabelHeight(width, true, 3, 5)).toBe(parisStationLabelHeight(width, true, 3, 20))
    expect(parisTrainLabelBudget(6.6, width, 'auto')).toBe(0)
    expect(parisTrainLabelBudget(37, width, 'auto')).toBe(0)
    expect(parisTrainLabelBudget(3, width, 'off')).toBe(0)
    expect(parisTrainLabelBudget(3, width, 'auto')).toBeGreaterThan(0)
    expect(parisTrainLabelBudget(3, width, 'auto')).toBeLessThanOrEqual(width === 390 ? 3 : 8)
  }
  const samples = [5, 10, 15, 21, 26, 32, 42].map(parisOverviewMix)
  expect(samples[0]).toBe(0)
  expect(samples.at(-1)).toBe(1)
  expect(samples).toEqual([...samples].sort((a, b) => a - b))
  expect(parisOverviewMix(21)).toBeCloseTo(0.5)
})

test('a station selected during a morph stays centred until a direct gesture releases it', () => {
  const source = transformParisScale(renderer)
  const node = parse(source, { sourceType: 'module' }).program.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'NetworkCamera')
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100)
  const handlers = new Map()
  const domElement = { addEventListener: (name, fn) => handlers.set(name, fn), removeEventListener: () => {}, setPointerCapture() {} }
  const slots = []
  let cursor = 0, frame
  const memo = (factory, deps) => {
    const index = cursor++, previous = slots[index]
    if (!previous || deps.some((d, i) => !Object.is(d, previous.deps[i]))) slots[index] = { value: factory(), deps }
    return slots[index].value
  }
  const scope = {
    ...mapCamera, THREE, parisHeartFromWorld,
    window: { matchMedia: () => ({ matches: true }) },
    useMemo: memo, useRef: (value) => memo(() => ({ current: value }), []),
    useEffect: (setup, deps) => memo(setup, deps), useFrame: (fn) => { frame = fn },
    useThree: () => ({ camera, gl: { domElement }, size: { width: 1000, height: 1000 } }),
    useContext: () => new Map(), LakeAvoidingPathsContext: {},
    stationCentre: (station, stops) => new THREE.Vector3(...stops[station.stopIndexes[0]]),
  }
  const Camera = new Function(...Object.keys(scope), `return (${source.slice(node.start, node.end)})`)(...Object.values(scope))
  const props = {
    time: 28800, isPlaying: false, playbackRate: 120,
    selectedStation: { name: 'Chosen station', stopIndexes: [0] },
    cameraCommand: { id: 1, action: 'reveal-station', distanceScale: 0.22 },
    cameraFraming: { homeDistanceScale: 1.12, minimumDistanceScale: 0.018 },
    mapFocus: new THREE.Vector3(), airProjection: {},
    projectedPaths: [],
  }
  const render = (x, mix) => {
    cursor = 0
    Camera({ ...props, projectedStops: [[x, 0, 0]], spatialLayoutMix: mix })
    frame({}, 1 / 60)
  }
  render(2, 0.2)
  expect(camera.position.x).toBe(2)
  render(12, 1)
  expect(camera.position.x).toBe(12)
  handlers.get('pointerdown')({ pointerType: 'mouse', button: 0, pointerId: 1, clientX: 500, clientY: 500 })
  render(18, 1)
  expect(camera.position.x).toBe(12)
})
