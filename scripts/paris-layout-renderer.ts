/** The alpha.4 layout API moves dynamic positions, but recreates static geometry
 * on every blend step. Keep rail/context geometry geographic and morph its
 * existing position buffers alongside the shared trains, labels and hit targets. */
export function transformParisLayout(source: string): string {
  const replace = (before: string, after: string, count = 1) => {
    if (source.split(before).length !== count + 1) throw new Error(`Paris layout renderer hook needs review: ${before}`)
    source = source.replaceAll(before, after)
  }
  // The authored morph changes label placement without replacing station data.
  // A geographic grid should recede as the plan's scale becomes variable.
  replace('function NationalGround({ quiet = false })', 'function NationalGround({ quiet = false, parisMix = 0 })')
  replace('_jsx(NationalGround, { quiet:', '_jsx(NationalGround, { parisMix: props.spatialLayoutMix ?? 0, quiet:')
  replace('opacity: 0.1, wireframe: true', 'opacity: 0.1 * (1 - parisMix), wireframe: true')
  replace('blendProjectedSpatialLayout(geographicStops, geographicPaths, alternateLayout, props.spatialLayoutMix ?? 0)', 'blendParisLayout(geographicStops, geographicPaths, alternateLayout, props.spatialLayoutMix ?? 0)')
  // Keep geographic detours stable too; selections/moving trains use the layout.
  replace('const lakeAvoidingPaths = useMemo(() => {\n        if ((props.spatialLayoutMix ?? 0) > 0)', 'const geographicDetours = useMemo(() => createLakeAvoidingPathMap(props.snapshot.edges, props.snapshot.edgePaths, geographicStops, projectedLakeRings), [props.snapshot, geographicStops, projectedLakeRings]);\n    const lakeAvoidingPaths = useMemo(() => {\n        if ((props.spatialLayoutMix ?? 0) > 0)')
  replace('return createLakeAvoidingPathMap(props.snapshot.edges, props.snapshot.edgePaths, projectedStops, projectedLakeRings);', 'return geographicDetours;')
  replace('_jsx(RailGraph, { snapshot: props.snapshot, infrastructureSnapshot: props.infrastructureSnapshot, projectedStops: projectedStops, projectedPaths: projectedPaths,', '_jsx(RailGraph, { snapshot: props.snapshot, infrastructureSnapshot: props.infrastructureSnapshot, projectedStops: geographicStops, projectedPaths: geographicPaths, parisProjection: projection, parisMix: props.spatialLayoutMix ?? 0,')
  replace('cameraFraming: props.cameraFraming, lakeAvoidingPaths: lakeAvoidingPaths, subdued:', 'cameraFraming: props.cameraFraming, lakeAvoidingPaths: geographicDetours, subdued:')
  replace('function RailGraph({ snapshot,', 'function RailGraph({ parisProjection, parisMix = 0, snapshot,')
  replace('useEffect(() => () => {\n        stationTexture.dispose();', 'const morphGeometry = useMemo(() => ({ railGeometry, stationGeometry, diagramStationGeometries }), [railGeometry, stationGeometry, diagramStationGeometries]);\n    useParisGeometryMorph(morphGeometry, parisProjection, parisMix);\n    useEffect(() => () => stationGeometry.dispose(), [stationGeometry]);\n    useEffect(() => () => {\n        stationTexture.dispose();')
  for (const name of ['RouteIdentityLayer', 'TrafficFlowLayer']) {
    replace(`function ${name}({ snapshot,`, `function ${name}({ parisProjection, parisMix = 0, snapshot,`)
    const reference = name === 'RouteIdentityLayer' ? 'infrastructureSnapshot' : 'snapshot'
    replace(`_jsx(${name}, { snapshot: ${reference},`, `_jsx(${name}, { parisProjection, parisMix, snapshot: ${reference},`)
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

  return 'import { blendParisLayout } from "/src/editions/paris-layout.ts";\nimport { useParisGeometryMorph } from "/src/studies/use-paris-geometry-morph.ts";\n' + source
}
