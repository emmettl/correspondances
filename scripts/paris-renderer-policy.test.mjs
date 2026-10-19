import { createParisCameraDriver } from '../src/studies/paris-camera-policy.ts'
import { parisMapStyle, parisSceneExtensions } from '../src/studies/paris-renderer-policy.ts'
import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import { expect, test } from 'vitest'
import * as THREE from 'three'
import * as stationLabels from '../node_modules/@motionstudies/three/station-labels.js'
import * as parisLabels from '../src/editions/paris-station-labels.ts'
import * as trainLabels from '../node_modules/@motionstudies/three/train-labels.js'
import * as mapCamera from '../node_modules/@motionstudies/three/map-camera.js'
import { parisHeartFromWorld } from '../src/editions/paris-layout.ts'
import { pickAirportTarget } from '../src/studies/airport-selection.ts'
import { parisOverviewMix, parisTrainLabelBudget, parisStationLabelHeight } from '../src/editions/paris-scale.ts'

const renderer = readFileSync('node_modules/@motionstudies/three/NationalNetworkScene.js', 'utf8')

test.each([
  ["Gare d'Austerlitz", 37],
  ['Unlisted local stop', 14.9],
])('visible station %s remains selectable beyond the old global cutoff', (name, height) => {
  const source = readFileSync('node_modules/@motionstudies/three/StationTapTarget.js', 'utf8')
  const picking = readFileSync('node_modules/@motionstudies/three/station-picking.js', 'utf8')
  const installerNode = parse(picking, { sourceType: 'module' }).program.body.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.id?.name === 'installStationTapTarget').declaration
  const node = parse(source, { sourceType: 'module' }).program.body.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.id?.name === 'StationTapTarget').declaration
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
    useProjectedTrainPosition: () => scope.projectedTrainPosition,
    useNetworkScene: () => ({ props: {} }),
    ...stationLabels, ...parisLabels, parisStationLabelHeight, THREE, pickAirportTarget,
    useThree: () => ({ camera, gl: { domElement: element }, scene: new THREE.Scene() }),
    useMemo: (factory) => factory(),
    useEffect: (setup) => setup(),
    stationCentre: (station) => new THREE.Vector3(station === target ? 0 : 1000, 0, 0),
  }
  // Execute the actual transformed pointer handler, with only React lifecycle
  // and world positions supplied by the test. This catches cutoff/index drift.
  scope.installStationTapTarget = new Function(...Object.keys(scope), `return (${picking.slice(installerNode.start, installerNode.end)})`)(...Object.values(scope))
  const tapTarget = new Function(...Object.keys(scope), `return (${source.slice(node.start, node.end)})`)(...Object.values(scope))
  tapTarget({ style: parisMapStyle.stationLabels, accepts: parisSceneExtensions.acceptsStationPick, stations, projectedStops: [], cameraFraming: {}, onSelectStation: (station) => { selected = station } })
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
  const source = renderer
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
  let resolvedTarget
  const extensions = { ...parisSceneExtensions, createCameraDriver: context => {
    const driver = createParisCameraDriver(context, { matches: true }), notify = driver.onCommand
    driver.onCommand = (command, station, target) => { resolvedTarget = target.clone(); notify(command, station, target) }
    return driver
  } }
  const scope = {
    useProjectedTrainPosition: () => scope.projectedTrainPosition,
    useNetworkScene: () => ({ props: { extensions } }),
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
  expect(resolvedTarget.toArray()).toEqual([2, 0, 0])
  expect(camera.position.x).toBe(2)
  render(12, 1)
  expect(camera.position.x).toBe(12)
  handlers.get('pointerdown')({ pointerType: 'mouse', button: 0, pointerId: 1, clientX: 500, clientY: 500 })
  render(18, 1)
  expect(camera.position.x).toBe(12)
})

test('Paris train policies use the supported renderer with unchanged ambient density and focused sizing', () => {
  for (const width of [390, 1440]) for (const height of [3, 6.6, 37]) for (const mode of ['off', 'auto', 'on']) {
    expect(trainLabels.styledTrainLabelBudget(parisMapStyle.trainLabels, height, width, mode)).toBe(parisTrainLabelBudget(height, width, mode))
    for (const selected of [false, true]) expect(trainLabels.styledTrainLabelScreenHeight(parisMapStyle.trainLabels, width, selected, height)).toBe(parisMapStyle.trainLabels.screenHeight(width, selected, height))
  }
  const transformed = renderer
  expect(transformed).not.toContain('parisTrainLabelBudget')
  expect(transformed).not.toContain('parisTrainLabelHeight')
  expect(transformed).toContain('styledTrainLabelBudget(labelStyle, semanticCameraHeight, size.width, trainLabelMode)')
})


test('supported viewport framing retains airport clearance across viewport and morph changes', () => {
  const camera = new THREE.PerspectiveCamera(), framing = mapCamera.createCameraViewportFraming(camera)
  for (const width of [390, 700, 701, 1440]) for (const height of [600, 844, 1000]) for (const mix of [0, 0.5, 1]) {
    const frame = parisSceneExtensions.cameraViewport({ width, height, spatialLayoutMix: mix })
    framing(frame, { width, height })
    const regionalZoom = width > 700 ? Math.min(1, Math.max(0.65, (height - 300) / 510)) : 1
    expect(camera.zoom).toBeCloseTo(regionalZoom + (1 - regionalZoom) * mix, 14)
    expect(camera.view.offsetY).toBe(-Math.round(height * 0.13 * (1 - mix)))
  }
  framing()
  expect(camera.zoom).toBe(1)
  expect(camera.view.enabled).toBe(false)
  expect(renderer).not.toContain('const regionalInset')
})


test('supported material policies update existing border and traffic materials and restore defaults', () => {
  let style = parisMapStyle, frame, refs = [], cursor = 0
  const scope = {
    THREE,
    useMapStyle: () => style,
    useRef: () => refs[cursor++],
    useMemo: factory => factory(),
    useEffect() {},
    useFrame: callback => { frame = callback },
    edgeTrafficWeights: () => ({ strengths: [] }),
    compactMapLines() {},
    useSpatialGeometryMorph() {},
    _jsx: (_type, props) => props,
    _jsxs: (_type, props) => props,
  }
  const component = name => {
    const node = parse(renderer, { sourceType: 'module' }).program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === name)
    return new Function(...Object.keys(scope), `return (${renderer.slice(node.start, node.end)})`)(...Object.values(scope))
  }
  const border = component('CountryBorder'), traffic = component('TrafficFlowLayer')
  const glow = new THREE.MeshBasicMaterial(), core = new THREE.MeshBasicMaterial()
  const group = { visible: true, children: [{ children: [{ material: glow }, { material: core }] }] }
  const camera = new THREE.PerspectiveCamera(), clock = { elapsedTime: 0 }
  const renderBorder = subdued => {
    refs = [{ current: group }]; cursor = 0
    border({ boundary: { rings: [] }, projection: {}, subdued, opacityScale: 0.5 })
  }
  for (const subdued of [false, true]) {
    style = parisMapStyle; renderBorder(subdued)
    for (const height of [5, 21, 42]) {
      camera.position.y = height; frame({ camera })
      const mix = parisOverviewMix(height) * 0.5
      expect(group.visible).toBe(mix > 0.001)
      expect(glow.opacity).toBeCloseTo((subdued ? 0.018 : 0.12) * mix)
      expect(core.opacity).toBeCloseTo((subdued ? 0.13 : 0.84) * mix)
    }
    style = {}; renderBorder(subdued); frame({ camera })
    expect(group.visible).toBe(true)
    expect(core.opacity).toBeCloseTo((subdued ? 0.13 : 0.84) * 0.5)
  }
  const weighted = new THREE.LineBasicMaterial(), pulse = new THREE.LineBasicMaterial()
  const renderTraffic = (subdued, suppressAtIdentity = false, identityMix = 0.4) => {
    refs = [{ current: weighted }, { current: pulse }]; cursor = 0
    return traffic({ snapshot: { edges: [] }, projectedStops: [], projectedPaths: [], lakeAvoidingPaths: new Map(), subdued, identityMix, overviewEmphasis: 0.2, suppressAtIdentity })
  }
  for (const subdued of [false, true]) for (const suppress of [false, true]) {
    style = parisMapStyle
    const rendered = renderTraffic(subdued, suppress)
    const geometry = rendered.children[0].geometry
    for (const height of [5, 21, 42]) {
      camera.position.y = height; frame({ camera, clock })
      expect(weighted.opacity).toBeCloseTo((subdued ? 0.045 : 0.62) * (suppress ? 0.6 : 1 - 0.4 * 0.78) * (1 + parisOverviewMix(height) * 1.2))
      expect(pulse.opacity).toBeCloseTo((subdued ? 0.018 : 0.16) * (suppress ? 0.6 : 1 - 0.4 * 0.72) * (1 + 0.2 * 1.15))
      expect(rendered.children[0].geometry).toBe(geometry)
    }
    style = {}; renderTraffic(subdued, suppress); frame({ camera, clock })
    expect(weighted.opacity).toBeCloseTo((subdued ? 0.045 : 0.62) * (suppress ? 0.6 : 1 - 0.4 * 0.78) * (1 + 0.2 * 1.2))
  }
  style = parisMapStyle; renderTraffic(false, true, 1); frame({ camera, clock })
  expect(weighted.opacity).toBe(0)
  expect(pulse.opacity).toBe(0)
  expect(renderer).not.toContain('parisOverviewMix')
})
