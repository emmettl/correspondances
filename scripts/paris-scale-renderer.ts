import type { Plugin } from 'vite'
import { transformParisLayout } from './paris-layout-renderer.ts'
import { transformParisAirportScene } from './paris-airport-renderer.ts'

/** Edition-only camera, morph and label policies not yet covered by public options.
 * Keep the installed renderer intact and reject changed hooks on upgrades.
 */
export function transformParisScale(source: string): string {
  const replace = (before: string, after: string, count = 1) => {
    if (source.split(before).length !== count + 1) throw new Error(`Paris scale renderer hook needs review: ${before}`)
    source = source.replaceAll(before, after)
  }
  replace('trainLabelBudget(semanticCameraHeight, trainLabelMode);', 'parisTrainLabelBudget(semanticCameraHeight, size.width, trainLabelMode);')
  replace('trainLabelScreenHeight(size.width, candidate.selected, semanticCameraHeight)', 'parisTrainLabelHeight(size.width, candidate.selected)')
  replace('stationLabelScreenHeight(selected, label.emphasised, label.station.labelRank)', 'parisStationLabelHeight(size.width, selected || label.emphasised, label.station.labelRank, semanticHeight)')
  replace('stationLabelWithinTier(label.station.labelRank, tierLimit)', 'parisStationLabelEligible(label.station, semanticHeight, tierLimit)')
  replace('const ranked = rankStationsForLabels(stations);', 'const ranked = parisStationLabels(rankStationsForLabels(stations));')
  // Avoid half a long terminus label hanging outside a narrow phone viewport.
  replace('const overlaps = occupied.some((other) => mapLabelBoxesOverlap(box, other))', 'if (box.left < 8 || box.right > size.width - 8 || box.top < 8 || box.bottom > size.height - 8) continue;\n            const overlaps = occupied.some((other) => mapLabelBoxesOverlap(box, other))', 2)

  // The administrative outline stays mounted and fades with real camera height.
  replace('function CountryBorder({ boundary, projection, subdued, opacityScale = 1, }) {', `function CountryBorder({ boundary, projection, subdued, opacityScale = 1, }) {
    const borderGroup = useRef(null);
    useFrame(({ camera }) => {
      if (!borderGroup.current) return;
      const mix = parisOverviewMix(camera.position.y) * opacityScale;
      borderGroup.current.visible = mix > 0.001;
      for (const ring of borderGroup.current.children) {
        ring.children[0].material.opacity = (subdued ? 0.018 : 0.12) * mix;
        ring.children[1].material.opacity = (subdued ? 0.13 : 0.84) * mix;
      }
    });`)
  replace('children: tubes.map(({ id, glow, core })', 'ref: borderGroup, children: tubes.map(({ id, glow, core })')

  // Change only material values as the camera moves: no React updates or new geometry.
  replace('const pulseMaterial = useRef(null);', 'const pulseMaterial = useRef(null);\n    const weightedMaterial = useRef(null);')
  replace('useFrame(({ clock }) => {\n        if (!pulseMaterial.current)', 'useFrame(({ clock, camera }) => {\n        const overviewEmphasis = parisOverviewMix(camera.position.y);\n        if (weightedMaterial.current) weightedMaterial.current.opacity = (subdued ? 0.045 : 0.62) * (1 - identityMix * 0.78) * (1 + overviewEmphasis * 1.2);\n        if (!pulseMaterial.current)')
  replace('opacity: (subdued ? 0.045 : 0.62) *', 'ref: weightedMaterial, opacity: (subdued ? 0.045 : 0.62) *')

  // Authored scale journeys settle over about 1.5 s; direct gestures stay immediate.
  replace('const lastCommand = useRef(0);', 'const lastCommand = useRef(0);\n    const scaleJourney = useRef(0);')
  replace('lastCommand.current = cameraCommand.id;', "lastCommand.current = cameraCommand.id;\n        scaleJourney.current = ['focus-location', 'reset'].includes(cameraCommand.action) ? 1.6 : 0;")
  replace('const onPointerDown = (event) => {\n            if (selectedTrain || selectedAirTrack', 'const onPointerDown = (event) => {\n            scaleJourney.current = 0;\n            if (selectedTrain || selectedAirTrack')
  replace('const onWheel = (event) => {', 'const onWheel = (event) => {\n            scaleJourney.current = 0;')
  replace('const damping = 1 -', 'scaleJourney.current = Math.max(0, scaleJourney.current - delta);\n        const damping = 1 -')
  replace('mapCameraDampingRate(Boolean(trainPosition || airPosition), directTouch.current)', '(scaleJourney.current > 0 && !trainPosition && !airPosition ? 3.2 : mapCameraDampingRate(Boolean(trainPosition || airPosition), directTouch.current))')
  return transformParisAirportScene(transformParisLayout('import { parisOverviewMix, parisTrainLabelBudget, parisTrainLabelHeight, parisStationLabelHeight } from "/src/editions/paris-scale.ts";\nimport { parisStationLabels, parisStationLabelEligible } from "/src/editions/paris-station-labels.ts";\n' + source))
}

export function parisScaleRenderer(): Plugin {
  return {
    name: 'correspondances-scale-renderer',
    enforce: 'pre',
    transform(source, id) {
      const moduleId = id.split('?')[0].replaceAll('\\', '/')
      if (moduleId.endsWith('/@motionstudies/three/StationTapTarget.js')) return { code: transformParisStationTap(source), map: null }
      if (moduleId.endsWith('/@motionstudies/three/station-picking.js')) return { code: transformParisStationPicking(source), map: null }
      if (moduleId.endsWith('/@motionstudies/three/NationalNetworkScene.js')) return { code: transformParisScale(source), map: null }
    },
  }
}

// These guarded transforms follow the renderer's private module boundaries.
// They preserve Paris admission, morph scale and airport-over-station priority.
function replaceHook(source: string, before: string, after: string): string {
  if (source.split(before).length !== 2) throw new Error(`Paris station renderer hook needs review: ${before}`)
  return source.replace(before, after)
}
export function transformParisStationTap(source: string): string {
  for (const [before, after] of [
    ['function StationTapTarget({ stations,', 'function StationTapTarget({ spatialLayoutMix = 0, stations,'],
    ['const { camera, gl } = useThree();', 'const { camera, gl, scene } = useThree();'],
    ['useMemo(() => rankStationsForLabels(stations), [stations])', 'useMemo(() => parisStationLabels(rankStationsForLabels(stations)), [stations])'],
    ['installStationTapTarget({ camera, element:', 'installStationTapTarget({ camera, scene, spatialLayoutMix, element:'],
    ['[camera, cameraFraming, gl, onSelectStation, projectedStops, rankedStations]', '[camera, cameraFraming, gl, scene, onSelectStation, projectedStops, rankedStations, spatialLayoutMix]'],
  ]) source = replaceHook(source, before, after)
  return 'import { parisStationLabels } from "/src/editions/paris-station-labels.ts";\n' + source
}
export function transformParisStationPicking(source: string): string {
  for (const [before, after] of [
    ['function installStationTapTarget({ camera, element,', 'function installStationTapTarget({ camera, scene, spatialLayoutMix = 0, element,'],
    ['stationLabelCameraHeight(camera.position.y, cameraFraming);', 'stationLabelCameraHeight(camera.position.y, cameraFraming) * (1 - spatialLayoutMix * 0.62);'],
    ['const rankLimit = Math.min(rankedStations.length, stationLabelRankLimit(semanticHeight));', 'const rankLimit = rankedStations.length;'],
    ['.flatMap((station, index) => {\n            projected.copy(stationCentre(station, projectedStops)).project(camera);', '.flatMap((station, index) => {\n            if (!parisStationLabelEligible(station, semanticHeight)) return [];\n            projected.copy(stationCentre(station, projectedStops)).project(camera);'],
    ['const screenHeight = stationLabelScreenHeight(false, false);', 'const screenHeight = parisStationLabelHeight(rect.width, false, station.labelRank, semanticHeight);'],
    ['const rect = element.getBoundingClientRect();', 'const rect = element.getBoundingClientRect();\n        if (pickAirportTarget(scene, camera, rect, event.clientX, event.clientY, start.pointerType === "touch")) return;'],
  ]) source = replaceHook(source, before, after)
  return 'import { parisStationLabelEligible } from "/src/editions/paris-station-labels.ts";\nimport { parisStationLabelHeight } from "/src/editions/paris-scale.ts";\nimport { pickAirportTarget } from "/src/studies/airport-selection.ts";\n' + source
}
