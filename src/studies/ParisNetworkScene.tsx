import { parisMapStyle, parisSceneExtensions } from './paris-renderer-policy.ts'
import { NationalNetworkScene, type NationalNetworkSceneProps } from '@motionstudies/three/NationalNetworkScene'
import { useNetworkScene } from '@motionstudies/three/scene-extensions'
import { ParisArcLayer } from './ParisArcLayer.tsx'
import { ParisAirportSelection, type ParisAirportSelectionProps } from './ParisAirportSelection.tsx'


function ParisArcs() {
  const { props, projectedPaths } = useNetworkScene()
  return <ParisArcLayer
    snapshot={props.snapshot}
    projectedPaths={projectedPaths}
    mix={props.spatialLayoutMix ?? 0}
    subdued={Boolean(props.selectedTrain || props.selectedRoute || props.selectedStation || props.airCategorySelected)}
  />
}

export function ParisNetworkScene(props: NationalNetworkSceneProps & ParisAirportSelectionProps) {
  return <NationalNetworkScene {...props} mapStyle={parisMapStyle} extensions={parisSceneExtensions}><ParisArcs /><ParisAirportSelection onSelectAirport={props.onSelectAirport} enabled={(props.spatialLayoutMix ?? 0) === 0} />{props.children}</NationalNetworkScene>
}
