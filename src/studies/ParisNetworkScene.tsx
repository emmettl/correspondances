import { FLAT_NETWORK_MAP_STYLE } from '@motionstudies/three/scene-style'
import type { ComponentType } from 'react'
import { NationalNetworkScene, type NationalNetworkSceneProps } from '@motionstudies/three/NationalNetworkScene'
import { useNetworkScene } from '@motionstudies/three/scene-extensions'
import { ParisArcLayer } from './ParisArcLayer.tsx'
import type { ParisAirportSelectionProps } from './ParisAirportSelection.tsx'

// Airport picking remains supplied by the edition's visual adapter.
const Scene = NationalNetworkScene as ComponentType<NationalNetworkSceneProps & ParisAirportSelectionProps>

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
  return <Scene {...props} mapStyle={FLAT_NETWORK_MAP_STYLE}><ParisArcs />{props.children}</Scene>
}
