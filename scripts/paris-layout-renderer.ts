/** The alpha.4 layout API moves dynamic positions, but recreates static geometry
 * on every blend step. Keep rail/context geometry geographic and morph its
 * existing position buffers alongside the shared trains, labels and hit targets. */
export function transformParisLayout(source: string): string {
  const replace = (before: string, after: string, count = 1) => {
    if (source.split(before).length !== count + 1) throw new Error(`Paris layout renderer hook needs review: ${before}`)
    source = source.replaceAll(before, after)
  }
  // A geographic grid should recede as the plan's scale becomes variable.
  replace('function NationalGround({ quiet = false })', 'function NationalGround({ quiet = false, parisMix = 0 })')
  replace('_jsx(NationalGround, { quiet:', '_jsx(NationalGround, { parisMix: props.spatialLayoutMix ?? 0, quiet:')
  replace('opacity: 0.1, wireframe: true', 'opacity: 0.1 * (1 - parisMix), wireframe: true')
  replace('blendProjectedSpatialLayout(geographicStops, geographicPaths, alternateLayout, props.spatialLayoutMix ?? 0)', 'blendParisLayout(geographicStops, geographicPaths, alternateLayout, props.spatialLayoutMix ?? 0)')
  // Keep geographic detours stable too; selections/moving trains use the layout.
  replace('const lakeAvoidingPaths = useMemo(() => {\n        if ((props.spatialLayoutMix ?? 0) > 0)', 'const geographicDetours = useMemo(() => createLakeAvoidingPathMap(props.snapshot.edges, props.snapshot.edgePaths, geographicStops, projectedLakeRings), [props.snapshot, geographicStops, projectedLakeRings]);\n    const lakeAvoidingPaths = useMemo(() => {\n        if ((props.spatialLayoutMix ?? 0) > 0)')
  replace('return createLakeAvoidingPathMap(props.snapshot.edges, props.snapshot.edgePaths, projectedStops, projectedLakeRings);', 'return geographicDetours;')
  replace('_jsx(RailGraph, { snapshot: props.snapshot, projectedStops: projectedStops, projectedPaths: projectedPaths,', '_jsx(RailGraph, { snapshot: props.snapshot, projectedStops: geographicStops, projectedPaths: geographicPaths, parisProjection: projection, parisMix: props.spatialLayoutMix ?? 0,')
  replace('cameraFraming: props.cameraFraming, lakeAvoidingPaths: lakeAvoidingPaths, subdued:', 'cameraFraming: props.cameraFraming, lakeAvoidingPaths: geographicDetours, subdued:')
  replace('function RailGraph({ snapshot,', 'function RailGraph({ parisProjection, parisMix = 0, snapshot,')
  replace('useEffect(() => () => {\n        stationTexture.dispose();', 'const morphGeometry = useMemo(() => ({ railGeometry, stationGeometry, diagramStationGeometries }), [railGeometry, stationGeometry, diagramStationGeometries]);\n    useParisGeometryMorph(morphGeometry, parisProjection, parisMix);\n    useEffect(() => () => stationGeometry.dispose(), [stationGeometry]);\n    useEffect(() => () => {\n        stationTexture.dispose();')
  for (const name of ['RouteIdentityLayer', 'TrafficFlowLayer']) {
    replace(`function ${name}({ snapshot,`, `function ${name}({ parisProjection, parisMix = 0, snapshot,`)
    replace(`_jsx(${name}, { snapshot: snapshot,`, `_jsx(${name}, { parisProjection, parisMix, snapshot: snapshot,`)
  }
  replace('useEffect(() => () => routes.forEach(({ geometry, casing, core }) => {', 'useParisGeometryMorph(routes, parisProjection, parisMix);\n    useEffect(() => () => routes.forEach(({ geometry, casing, core }) => {')
  replace('useEffect(() => () => {\n        geometries.weighted.dispose();', 'useParisGeometryMorph(geometries, parisProjection, parisMix);\n    useEffect(() => () => {\n        geometries.weighted.dispose();')

  // The Seine and périphérique use precisely the same mapping as the railway.
  for (const [name, first] of [['LakeLayer', 'lakes'], ['ReferencePathLayer', 'references'], ['CountryBorder', 'boundary']]) {
    replace(`function ${name}({ ${first}, projection,`, `function ${name}({ ${first}, projection, parisMix = 0,`)
    replace(`_jsx(${name}, { ${first}: props.${first === 'references' ? 'referencePaths' : first}, projection: projection,`, `_jsx(${name}, { parisMix: props.spatialLayoutMix ?? 0, ${first}: props.${first === 'references' ? 'referencePaths' : first}, projection: projection,`)
  }
  replace('lakes: props.lakes, projection: projection, opacityScale: 1 - (props.spatialLayoutMix ?? 0)', 'lakes: props.lakes, projection: projection, opacityScale: 1')
  replace('}, [lakes.lakes, projection]);', '}, [lakes.lakes, projection]);\n    useParisGeometryMorph(geometry, projection, parisMix);')
  replace('}), [projection, references.references]);', '}), [projection, references.references]);\n    useParisGeometryMorph(paths, projection, parisMix);')
  replace('}, [boundary.rings, projection]);', '}, [boundary.rings, projection]);\n    useParisGeometryMorph(tubes, projection, parisMix);')

  // The expanded centre has room for interchange names at overview framing.
  replace('function StationLabels({ stations,', 'function StationLabels({ spatialLayoutMix = 0, stations,')
  replace('function StationTapTarget({ stations,', 'function StationTapTarget({ spatialLayoutMix = 0, stations,')
  replace('_jsx(StationLabels, { stations:', '_jsx(StationLabels, { spatialLayoutMix: props.spatialLayoutMix, stations:')
  replace('_jsx(StationTapTarget, { stations:', '_jsx(StationTapTarget, { spatialLayoutMix: props.spatialLayoutMix, stations:')
  replace('const semanticHeight = stationLabelCameraHeight(camera.position.y, cameraFraming);', 'const semanticHeight = stationLabelCameraHeight(camera.position.y, cameraFraming) * (1 - spatialLayoutMix * 0.62);', 2)
  replace('[camera, cameraFraming, gl, onSelectStation, projectedStops, rankedStations]);', '[camera, cameraFraming, gl, onSelectStation, projectedStops, rankedStations, spatialLayoutMix]);')
  replace('_jsx(VehicleTrails, { ...props,', '_jsx(ParisArcLayer, { snapshot: props.snapshot, projectedPaths, mix: props.spatialLayoutMix ?? 0, subdued: Boolean(props.selectedTrain || props.selectedRoute || props.selectedStation || props.airCategorySelected) }), _jsx(VehicleTrails, { ...props,')

  // Geographic focus commands (including the correspondence director) must
  // follow the same morph. Direct gestures release the authored focus.
  replace('const lastCommand = useRef(0);', 'const lastCommand = useRef(0);\n    const parisFocus = useRef(undefined);\n    const parisStationFocus = useRef(undefined);\n    const parisMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);')
  replace('camera.position.lerp(desiredPosition, damping);', 'camera.position.lerp(desiredPosition, parisMotion.matches ? 1 : damping);')
  replace('currentTarget.lerp(desiredTarget, damping);', 'currentTarget.lerp(desiredTarget, parisMotion.matches ? 1 : damping);')
  replace('lastCommand.current = cameraCommand.id;', 'lastCommand.current = cameraCommand.id;\n        parisFocus.current = cameraCommand.action === "focus-location" ? cameraCommand.focus : undefined;\n        parisStationFocus.current = cameraCommand.action === "reveal-station" ? selectedStation : undefined;')
  replace('const onWheel = (event) => {', 'const onWheel = (event) => {\n            parisFocus.current = undefined;\n            parisStationFocus.current = undefined;')
  replace('const onPointerDown = (event) => {\n            scaleJourney.current = 0;', 'const onPointerDown = (event) => {\n            parisFocus.current = undefined;\n            parisStationFocus.current = undefined;\n            scaleJourney.current = 0;')
  replace('const diagramMix = THREE.MathUtils.clamp(spatialLayoutMix, 0, 1);', `const diagramMix = THREE.MathUtils.clamp(spatialLayoutMix, 0, 1);
        if (parisFocus.current) {
            const [x, , z] = projectCoordinate(parisFocus.current, airProjection);
            const [heartX, heartZ] = parisHeartFromWorld(x, z, airProjection);
            mapTarget.current.set(x + (heartX - x) * diagramMix, 0, z + (heartZ - z) * diagramMix);
        } else if (parisStationFocus.current) {
            mapTarget.current.copy(stationCentre(parisStationFocus.current, projectedStops));
        }`)
  return 'import { blendParisLayout, parisHeartFromWorld } from "/src/editions/paris-layout.ts";\nimport { useParisGeometryMorph } from "/src/studies/use-paris-geometry-morph.ts";\nimport { ParisArcLayer } from "/src/studies/ParisArcLayer.tsx";\n' + source
}
