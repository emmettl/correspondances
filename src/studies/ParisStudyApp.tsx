import { AirportHeroCard } from '@motionstudies/web/components/AirportHeroCard'
import '@motionstudies/web/airport-hero-card.css'
import { airportBoardMovements } from '@motionstudies/core/domain/airport'
import { AIRPORT_LABELS, AIRPORT_NOTES } from './airport-copy.ts'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react'
import {
  buildRouteIndex,
  buildStationIndex,
  formatServiceTime,
  type InterchangeComplex,
  type NetworkRouteIndexEntry,
  type NetworkSnapshot,
  type NetworkTrain,
  type StationIndexEntry,
} from '@motionstudies/core/domain/network'
import { activeAirTracks, positionForAirTrack } from '@motionstudies/core/domain/air'
import { airTrackSearchValue, searchAirTracks, type AirSearchTrack } from '@motionstudies/core/air-search'
import { airportAirTrackIds, searchAirports, type StudyAirport } from '@motionstudies/core/domain/airport'
import { PARIS_AIRPORTS } from '../editions/paris-airports.ts'
import { useParisAir } from './use-paris-air.ts'
import { useParisRailLayer } from './use-paris-rail-layer.ts'
import { useParisLayout } from './use-paris-layout.ts'
import { buildParisHeartLayout } from '../editions/paris-layout.ts'
import { mergeNetworkLayers } from '@motionstudies/core/domain/network-layers'
import { motionStudyMark } from '../editions/catalogue.ts'
import { editionDataUrl } from '../editions/data-url.ts'
import {
  parisBoundary,
  parisReferences,
  parisWater,
  type ParisGeographySnapshot,
} from '../editions/paris-geography.ts'
import {
  CORRESPONDANCES_ROUTE_COLORS,
  type ParisEdition,
} from '../editions/paris.ts'
import type {
  MapCameraAction,
  MapCameraCommand,
} from '@motionstudies/three/NationalNetworkScene'
import type { TrainLabelMode } from '@motionstudies/three/train-labels'
import { foldSearchText } from '@motionstudies/core/search-text'
import { useProgressiveNetworkDay } from '@motionstudies/web/use-progressive-network-day'

const NationalNetworkScene = lazy(() =>
  import('@motionstudies/three/NationalNetworkScene').then(
    ({ NationalNetworkScene: Scene }) => ({ default: Scene }),
  ),
)

const PLAYBACK_RATES = [
  { label: '1×', value: 30 },
  { label: '4×', value: 120 },
  { label: '16×', value: 480 },
] as const

type SearchChoice =
  | { readonly kind: 'air'; readonly value: AirSearchTrack }
  | { readonly kind: 'airport'; readonly value: StudyAirport }
  | { readonly kind: 'station'; readonly value: StationIndexEntry }
  | { readonly kind: 'route'; readonly value: NetworkRouteIndexEntry }
  | { readonly kind: 'train'; readonly value: NetworkTrain }

interface ConnectionOpportunity {
  readonly complex: InterchangeComplex
  readonly station: StationIndexEntry
  readonly incoming: NetworkTrain
  readonly outgoing: NetworkTrain
  readonly arrival: number
  readonly departure: number
  readonly minimumTransferSeconds: number
}

type ParisScaleView = 'centre' | 'region'

const PARIS_HUB_STUDIES = [
  {
    complexId: 'chatelet-les-halles',
    title: 'Cœur',
    description: 'densité Métro au centre',
    distanceScale: 0.16,
  },
  {
    complexId: 'gare-de-lyon',
    title: 'Traversée',
    description: 'échange Métro–RER est-ouest',
    distanceScale: 0.18,
  },
  {
    complexId: 'la-defense',
    title: 'Seuil',
    description: 'le réseau régional rencontre Paris',
    distanceScale: 0.2,
  },
] as const

function formatWindowBoundary(seconds: number): string {
  return seconds === 86_400 ? '24:00' : formatServiceTime(seconds)
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function searchNetworkChoices(
  query: string,
  snapshot: NetworkSnapshot,
  stations: readonly StationIndexEntry[],
  routes: readonly NetworkRouteIndexEntry[],
): { readonly places: readonly SearchChoice[]; readonly trains: readonly SearchChoice[] } {
  const folded = foldSearchText(query.trim())
  if (!folded) return { places: [], trains: [] }
  const stationMatches = stations
    .filter((station) => foldSearchText(station.name).includes(folded))
    .slice(0, 5)
    .map((value): SearchChoice => ({ kind: 'station', value }))
  const routeMatches = routes
    .filter((route) =>
      foldSearchText(`${route.name} ${route.headsigns.join(' ')}`).includes(folded),
    )
    .slice(0, 2)
    .map((value): SearchChoice => ({ kind: 'route', value }))
  const trainMatches = snapshot.trains
    .filter((train) =>
      foldSearchText(`${train.shortName} ${train.route} ${train.headsign}`).includes(folded),
    )
    .slice(0, 5)
    .map((value): SearchChoice => ({ kind: 'train', value }))
  const airportMatches = searchAirports(PARIS_AIRPORTS, query, 3).map(
    (value): SearchChoice => ({ kind: 'airport', value }),
  )
  return {
    places: [...airportMatches, ...stationMatches, ...routeMatches],
    trains: trainMatches,
  }
}

function stationForComplex(
  complex: InterchangeComplex,
  snapshot: NetworkSnapshot,
): StationIndexEntry {
  const stopIds = new Set(complex.stopIds)
  const stopIndexes = snapshot.stops.flatMap((stop, index) =>
    stop[4] && stopIds.has(stop[4]) ? [index] : [],
  )
  const trainIds = snapshot.trains.flatMap((train) =>
    train.stops.some((call) => stopIndexes.includes(call[0])) ? [train.id] : [],
  )
  const routeRecords = new Map<string, { name: string; category: NetworkTrain['category'] }>()
  for (const train of snapshot.trains) {
    if (!trainIds.includes(train.id)) continue
    routeRecords.set(train.route, { name: train.route, category: train.category })
  }
  return {
    name: complex.name,
    labelRank: 1,
    stopIndexes,
    trainIds,
    routes: [...routeRecords.values()],
  }
}

function nextConnection(
  snapshot: NetworkSnapshot,
  fromTime: number,
  complexId?: string,
): ConnectionOpportunity | undefined {
  const stopIndexById = new Map(
    snapshot.stops.flatMap((stop, index) => stop[4] ? [[stop[4], index] as const] : []),
  )
  const candidates: ConnectionOpportunity[] = []
  for (const complex of snapshot.metadata.interchangeStudy?.complexes ?? []) {
    if (complexId && complex.id !== complexId) continue
    const station = stationForComplex(complex, snapshot)
    for (const link of complex.links) {
      const fromIndex = stopIndexById.get(link.fromStopId)
      const toIndex = stopIndexById.get(link.toStopId)
      if (fromIndex === undefined || toIndex === undefined) continue
      const arrivals = snapshot.trains.flatMap((train) =>
        train.stops.flatMap((call) =>
          call[0] === fromIndex && call[1] >= fromTime
            ? [{ train, arrival: call[1] }]
            : [],
        ),
      )
      for (const arrival of arrivals) {
        const threshold = arrival.arrival + link.minimumTransferSeconds
        const departure = snapshot.trains
          .flatMap((train) =>
            train.id === arrival.train.id
              ? []
              : train.stops.flatMap((call) =>
                  call[0] === toIndex && call[2] >= threshold
                    ? [{ train, departure: call[2] }]
                    : [],
                ),
          )
          .sort((first, second) => first.departure - second.departure)[0]
        if (!departure) continue
        candidates.push({
          complex,
          station,
          incoming: arrival.train,
          outgoing: departure.train,
          arrival: arrival.arrival,
          departure: departure.departure,
          minimumTransferSeconds: link.minimumTransferSeconds,
        })
      }
    }
  }
  return candidates.sort(
    (first, second) => first.arrival - second.arrival || first.departure - second.departure,
  )[0]
}

export function ParisStudyApp({ edition }: { readonly edition: ParisEdition }) {
  const [openingNetwork, setOpeningNetwork] = useState<NetworkSnapshot>()
  const [centralCrossNetwork, setCentralCrossNetwork] = useState<NetworkSnapshot>()
  const [centralCrossEnabled, setCentralCrossEnabled] = useState(true)
  const [centralCrossLoading, setCentralCrossLoading] = useState(true)
  const [centralCrossError, setCentralCrossError] = useState(false)
  const [regionalRerNetwork, setRegionalRerNetwork] = useState<NetworkSnapshot>()
  const [regionalRerEnabled, setRegionalRerEnabled] = useState(true)
  const [regionalRerLoading, setRegionalRerLoading] = useState(true)
  const [regionalRerError, setRegionalRerError] = useState(false)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const [geography, setGeography] = useState<ParisGeographySnapshot>()
  const [loadError, setLoadError] = useState(false)
  const [time, setTime] = useState(edition.defaultNetworkTime)
  const [isPlaying, setIsPlaying] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(120)
  const [studyWindow, setStudyWindow] = useState<'morning' | 'day'>('morning')
  const metroArcs = useParisRailLayer(edition.data.layers.metroArcsMorning, edition.data.layers.metroArcsDayManifest, studyWindow, time)
  const { network: metroArcsLayer, toggle: toggleMetroArcsLayer } = metroArcs
  const metroCrossings = useParisRailLayer(edition.data.layers.metroCrossingsMorning, edition.data.layers.metroCrossingsDayManifest, studyWindow, time)
  const { network: metroCrossingsLayer, toggle: toggleMetroCrossingsLayer } = metroCrossings
  const metroEast = useParisRailLayer(edition.data.layers.metroEastMorning, edition.data.layers.metroEastDayManifest, studyWindow, time)
  const { network: metroEastLayer, toggle: toggleMetroEastLayer } = metroEast
  const metroBoulevards = useParisRailLayer(edition.data.layers.metroBoulevardsMorning, edition.data.layers.metroBoulevardsDayManifest, studyWindow, time)
  const { network: metroBoulevardsLayer, toggle: toggleMetroBoulevardsLayer } = metroBoulevards
  const metroWest = useParisRailLayer(edition.data.layers.metroWestMorning, edition.data.layers.metroWestDayManifest, studyWindow, time)
  const { network: metroWestLayer, toggle: toggleMetroWestLayer } = metroWest
  const metroLocal = useParisRailLayer(edition.data.layers.metroLocalMorning, edition.data.layers.metroLocalDayManifest, studyWindow, time)
  const { network: metroLocalLayer, toggle: toggleMetroLocalLayer } = metroLocal
  const transilienNorth = useParisRailLayer(edition.data.layers.transilienNorthMorning, edition.data.layers.transilienNorthDayManifest, studyWindow, time)
  const { network: transilienNorthLayer, toggle: toggleTransilienNorthLayer } = transilienNorth
  const transilienSaintLazare = useParisRailLayer(edition.data.layers.transilienSaintLazareMorning, edition.data.layers.transilienSaintLazareDayManifest, studyWindow, time)
  const { network: transilienSaintLazareLayer, toggle: toggleTransilienSaintLazareLayer } = transilienSaintLazare
  const transilienSouthwest = useParisRailLayer(edition.data.layers.transilienSouthwestMorning, edition.data.layers.transilienSouthwestDayManifest, studyWindow, time)
  const { network: transilienSouthwestLayer, toggle: toggleTransilienSouthwestLayer } = transilienSouthwest
  const transilienEast = useParisRailLayer(edition.data.layers.transilienEastMorning, edition.data.layers.transilienEastDayManifest, studyWindow, time)
  const { network: transilienEastLayer, toggle: toggleTransilienEastLayer } = transilienEast
  const tramMarechaux = useParisRailLayer(edition.data.layers.tramMarechauxMorning, edition.data.layers.tramMarechauxDayManifest, studyWindow, time)
  const { network: tramMarechauxLayer, toggle: toggleTramMarechauxLayer } = tramMarechaux
  const air = useParisAir(edition, studyWindow, time)
  const { setEnabled: setAirEnabled } = air
  const [selectedAirTrackId, setSelectedAirTrackId] = useState<string>()
  const [selectedAirport, setSelectedAirport] = useState<StudyAirport>()
  const [airCategorySelected, setAirCategorySelected] = useState(false)
  const selectedAirTrack = useMemo(() => air.snapshot?.tracks.find((track) => track.id === selectedAirTrackId), [air.snapshot, selectedAirTrackId])
  const selectedAirEntry = air.aircraft.find((track) => track.id === selectedAirTrackId)
  const selectedAirPosition = selectedAirTrack ? positionForAirTrack(selectedAirTrack, time) : undefined
  const activeAircraft = useMemo(() => air.snapshot ? activeAirTracks(air.snapshot, time) : [], [air.snapshot, time])
  const airportMovements = useMemo(() => selectedAirport ? airportBoardMovements(air.aircraft, selectedAirport) : { departures: [], arrivals: [] }, [selectedAirport, air.aircraft])
  const airportTrackIds = useMemo(() => selectedAirport && air.snapshot ? airportAirTrackIds(air.snapshot.tracks, selectedAirport) : undefined, [selectedAirport, air.snapshot])
  const activeAircraftCount = airportTrackIds ? activeAircraft.filter((track) => airportTrackIds.has(track.id)).length : activeAircraft.length
  const [scaleView, setScaleView] = useState<ParisScaleView>('region')
  const heart = useParisLayout(scaleView === 'centre')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSearchIndex, setActiveSearchIndex] = useState(0)
  const [selectedStation, setSelectedStation] = useState<StationIndexEntry>()
  const [selectedRoute, setSelectedRoute] = useState<NetworkRouteIndexEntry>()
  const [selectedTrain, setSelectedTrain] = useState<NetworkTrain>()
  const [selectedConnection, setSelectedConnection] = useState<ConnectionOpportunity>()
  const [activeHubStudyIndex, setActiveHubStudyIndex] = useState(-1)
  const [trainLabelMode, setTrainLabelMode] = useState<TrainLabelMode>('auto')
  const [limitedChrome, setLimitedChrome] = useState(false)
  const [statusExpanded, setStatusExpanded] = useState(false)
  const [cameraCommand, setCameraCommand] = useState<MapCameraCommand>()
  const webglAvailable = useMemo(() => supportsWebGL(), [])
  const dayStudy = useProgressiveNetworkDay(
    edition.data.opening.dayManifest,
    studyWindow === 'day',
    time,
    editionDataUrl,
  )
  const centralCrossDayStudy = useProgressiveNetworkDay(
    edition.data.layers.centralCrossDayManifest,
    studyWindow === 'day' && centralCrossEnabled,
    time,
    editionDataUrl,
  )
  const regionalRerDayStudy = useProgressiveNetworkDay(
    edition.data.layers.regionalRerDayManifest,
    studyWindow === 'day' && regionalRerEnabled,
    time,
    editionDataUrl,
  )
  const baseNetwork = studyWindow === 'day'
    ? (dayStudy.network ?? openingNetwork)
    : openingNetwork
  const centralCrossLayer = studyWindow === 'day'
    ? centralCrossDayStudy.network
    : centralCrossNetwork
  const regionalRerLayer = studyWindow === 'day'
    ? regionalRerDayStudy.network
    : regionalRerNetwork
  const network = useMemo(() => {
    if (!baseNetwork) return undefined
    const optionalLayers: NetworkSnapshot[] = []
    if (
      centralCrossEnabled &&
      centralCrossLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
      centralCrossLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd
    ) {
      optionalLayers.push(centralCrossLayer)
    }
    if (
      regionalRerEnabled &&
      regionalRerLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
      regionalRerLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd
    ) {
      optionalLayers.push(regionalRerLayer)
    }
    if (metroArcsLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        metroArcsLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(metroArcsLayer)
    }
    if (metroCrossingsLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        metroCrossingsLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(metroCrossingsLayer)
    }
    if (metroEastLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        metroEastLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(metroEastLayer)
    }
    if (metroBoulevardsLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        metroBoulevardsLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(metroBoulevardsLayer)
    }
    if (metroWestLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        metroWestLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(metroWestLayer)
    }
    if (metroLocalLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        metroLocalLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(metroLocalLayer)
    }
    if (transilienNorthLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        transilienNorthLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(transilienNorthLayer)
    }
    if (transilienSaintLazareLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        transilienSaintLazareLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(transilienSaintLazareLayer)
    }
    if (transilienSouthwestLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        transilienSouthwestLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(transilienSouthwestLayer)
    }
    if (transilienEastLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        transilienEastLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(transilienEastLayer)
    }
    if (tramMarechauxLayer?.metadata.windowStart === baseNetwork.metadata.windowStart &&
        tramMarechauxLayer.metadata.windowEnd === baseNetwork.metadata.windowEnd) {
      optionalLayers.push(tramMarechauxLayer)
    }
    return optionalLayers.length
      ? mergeNetworkLayers([baseNetwork, ...optionalLayers])
      : baseNetwork
  }, [baseNetwork, centralCrossEnabled, centralCrossLayer, regionalRerEnabled, regionalRerLayer, metroArcsLayer, metroCrossingsLayer, metroEastLayer, metroBoulevardsLayer, metroWestLayer, metroLocalLayer, transilienNorthLayer, transilienSaintLazareLayer, transilienSouthwestLayer, transilienEastLayer, tramMarechauxLayer])
  const centralCrossLayerLoading = studyWindow === 'day'
    ? centralCrossDayStudy.loading
    : centralCrossLoading
  const centralCrossLayerError = centralCrossError || centralCrossDayStudy.error
  const heartLayout = useMemo(() => network ? buildParisHeartLayout(network) : undefined, [network])

  const regionalRerLayerLoading = studyWindow === 'day'
    ? regionalRerDayStudy.loading
    : regionalRerLoading
  const regionalRerLayerError = regionalRerError || regionalRerDayStudy.error

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(editionDataUrl(edition.data.opening.network)).then((response) => {
        if (!response.ok) throw new Error('Network unavailable')
        return response.json() as Promise<NetworkSnapshot>
      }),
      fetch(editionDataUrl(edition.data.opening.geography)).then((response) => {
        if (!response.ok) throw new Error('Geography unavailable')
        return response.json() as Promise<ParisGeographySnapshot>
      }),
    ])
      .then(([snapshot, geographySnapshot]) => {
        if (cancelled) return
        setOpeningNetwork(snapshot)
        setGeography(geographySnapshot)
        setTime(snapshot.metadata.focusTime)
      })
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
  }, [edition])

  useEffect(() => {
    if (studyWindow !== 'morning' || !centralCrossEnabled || centralCrossNetwork) return
    let cancelled = false
    fetch(editionDataUrl(edition.data.layers.centralCrossMorning))
      .then((response) => {
        if (!response.ok) throw new Error('Central-cross layer unavailable')
        return response.json() as Promise<NetworkSnapshot>
      })
      .then((snapshot) => {
        if (!cancelled) setCentralCrossNetwork(snapshot)
      })
      .catch(() => {
        if (cancelled) return
        setCentralCrossError(true)
        setCentralCrossEnabled(false)
      })
      .finally(() => {
        if (!cancelled) setCentralCrossLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [centralCrossEnabled, centralCrossNetwork, edition.data.layers.centralCrossMorning, studyWindow])

  useEffect(() => {
    if (studyWindow !== 'morning' || !regionalRerEnabled || regionalRerNetwork) return
    let cancelled = false
    fetch(editionDataUrl(edition.data.layers.regionalRerMorning))
      .then((response) => {
        if (!response.ok) throw new Error('Regional RER layer unavailable')
        return response.json() as Promise<NetworkSnapshot>
      })
      .then((snapshot) => {
        if (!cancelled) setRegionalRerNetwork(snapshot)
      })
      .catch(() => {
        if (cancelled) return
        setRegionalRerError(true)
        setRegionalRerEnabled(false)
      })
      .finally(() => {
        if (!cancelled) setRegionalRerLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [edition.data.layers.regionalRerMorning, regionalRerEnabled, regionalRerNetwork, studyWindow])

  const stations = useMemo(
    () => (network ? buildStationIndex(network) : []),
    [network],
  )
  const routes = useMemo(
    () => (network ? buildRouteIndex(network) : []),
    [network],
  )
  // Timetable search is independent of playback. Only aircraft ranking needs
  // the clock, and neither search needs to run while its results are closed.
  const networkChoices = useMemo(
    () => searchOpen && network
      ? searchNetworkChoices(query, network, stations, routes)
      : { places: [], trains: [] },
    [searchOpen, network, query, routes, stations],
  )
  const choices = useMemo(() => {
    const airMatches = searchOpen && air.enabled && query.trim()
      ? searchAirTracks(air.aircraft, query, time, 4).map(
          (value): SearchChoice => ({ kind: 'air', value }),
        )
      : []
    return [...networkChoices.places, ...airMatches, ...networkChoices.trains].slice(0, 8)
  }, [networkChoices, searchOpen, air.enabled, query, air.aircraft, time])
  const boundary = useMemo(
    () => (geography ? parisBoundary(geography) : undefined),
    [geography],
  )
  const water = useMemo(
    () => (geography ? parisWater(geography) : undefined),
    [geography],
  )
  const references = useMemo(
    () => (geography ? parisReferences(geography) : undefined),
    [geography],
  )
  const countableTrains = useMemo(() => {
    const stationTrainIds = selectedStation
      ? new Set(stations.find((station) => station.name === selectedStation.name)?.trainIds ?? [])
      : undefined
    return network?.trains.filter((train) =>
      (!stationTrainIds || stationTrainIds.has(train.id)) &&
      (!selectedRoute || (train.route === selectedRoute.name && train.category === selectedRoute.category)),
    ) ?? []
  }, [network, selectedRoute, selectedStation, stations])
  const activeTrainCount = useMemo(
    () => countableTrains.filter((train) => train.realtime?.status !== 'cancelled' && time >= train.start && time <= train.end).length,
    [countableTrains, time],
  )

  const moveCamera = useCallback((action: MapCameraAction) => {
    if (action === 'reset') setScaleView('region')
    setCameraCommand((current) => ({ id: (current?.id ?? 0) + 1, action }))
  }, [])

  const clearAirSelection = useCallback(() => {
    setSelectedAirTrackId(undefined)
    setSelectedAirport(undefined)
    setAirCategorySelected(false)
  }, [])

  const clearSelection = useCallback(() => {
    clearAirSelection()
    setSelectedStation(undefined)
    setSelectedRoute(undefined)
    setSelectedTrain(undefined)
    setSelectedConnection(undefined)
    setActiveHubStudyIndex(-1)
    setQuery('')
    setSearchOpen(false)
  }, [clearAirSelection, setSearchOpen])

  const activateStudyWindow = useCallback((next: 'morning' | 'day') => {
    if (next === studyWindow) return
    clearSelection()
    setStudyWindow(next)
    setTime(
      next === 'day'
        ? time
        : (openingNetwork?.metadata.focusTime ?? edition.defaultNetworkTime),
    )
  }, [clearSelection, edition.defaultNetworkTime, openingNetwork, studyWindow, time])

  const toggleCentralCross = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    if (centralCrossEnabled) {
      setCentralCrossEnabled(false)
      setCentralCrossLoading(false)
      moveCamera('reset')
      return
    }
    setCentralCrossError(false)
    setCentralCrossLoading(studyWindow === 'morning' && !centralCrossNetwork)
    setCentralCrossEnabled(true)
    setScaleView('region')
    moveCamera('reset')
  }, [centralCrossEnabled, centralCrossNetwork, clearSelection, moveCamera, studyWindow])

  const toggleRegionalRer = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    if (regionalRerEnabled) {
      setRegionalRerEnabled(false)
      setRegionalRerLoading(false)
      moveCamera('reset')
      return
    }
    setRegionalRerError(false)
    setRegionalRerLoading(studyWindow === 'morning' && !regionalRerNetwork)
    setRegionalRerEnabled(true)
    setScaleView('region')
    moveCamera('reset')
  }, [clearSelection, moveCamera, regionalRerEnabled, regionalRerNetwork, studyWindow])

  const toggleMetroArcs = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleMetroArcsLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleMetroArcsLayer])

  const toggleMetroCrossings = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleMetroCrossingsLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleMetroCrossingsLayer])

  const toggleMetroEast = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleMetroEastLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleMetroEastLayer])

  const toggleMetroBoulevards = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleMetroBoulevardsLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleMetroBoulevardsLayer])

  const toggleMetroWest = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleMetroWestLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleMetroWestLayer])

  const toggleMetroLocal = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleMetroLocalLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleMetroLocalLayer])

  const toggleTransilienNorth = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleTransilienNorthLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleTransilienNorthLayer])

  const toggleTransilienSaintLazare = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleTransilienSaintLazareLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleTransilienSaintLazareLayer])

  const toggleTransilienSouthwest = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleTransilienSouthwestLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleTransilienSouthwestLayer])

  const toggleTransilienEast = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleTransilienEastLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleTransilienEastLayer])

  const toggleTramMarechaux = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    toggleTramMarechauxLayer()
    moveCamera('reset')
  }, [clearSelection, moveCamera, toggleTramMarechauxLayer])

  const toggleScaleView = useCallback(() => {
    if (!network) return
    clearSelection()
    if (scaleView === 'centre') {
      setScaleView('region')
      moveCamera('reset')
      return
    }
    setScaleView('centre')
    setCameraCommand((current) => ({
      id: (current?.id ?? 0) + 1,
      action: 'reset',
    }))
  }, [clearSelection, moveCamera, network, scaleView])

  const revealHeartArcs = useCallback(() => {
    clearSelection()
    setLayerMenuOpen(false)
    if (!metroArcs.enabled) toggleMetroArcsLayer()
  }, [clearSelection, metroArcs.enabled, toggleMetroArcsLayer])

  const selectStation = useCallback((station: StationIndexEntry) => {
    clearAirSelection()
    setActiveHubStudyIndex(-1)
    setSelectedStation(station)
    setSelectedRoute(undefined)
    setSelectedTrain(undefined)
    setSelectedConnection(undefined)
    setQuery(station.name)
    setSearchOpen(false)
    setCameraCommand((current) => ({
      id: (current?.id ?? 0) + 1,
      action: 'reveal-station',
      distanceScale: station.labelRank === 1 ? 0.22 : 0.32,
    }))
  }, [clearAirSelection, setSearchOpen])

  const selectAirTrack = useCallback((id: string) => {
    const track = air.aircraft.find((candidate) => candidate.id === id)
    if (!track) return
    clearSelection()
    setScaleView('region')
    setSelectedAirTrackId(id)
    setTime((current) => current >= track.start && current <= track.end ? current : Math.min(track.end, track.start + 10))
    setQuery(airTrackSearchValue(track))
    setIsPlaying(true)
  }, [air.aircraft, clearSelection])

  const activateChoice = useCallback((choice: SearchChoice) => {
    if (choice.kind === 'air') { selectAirTrack(choice.value.id); return }
    if (choice.kind === 'airport') {
      clearSelection()
      setAirEnabled(true)
      setSelectedAirport(choice.value)
      setAirCategorySelected(true)
      setQuery(`${choice.value.name} · ${choice.value.iata}`)
      setScaleView('region')
      setCameraCommand((current) => ({ id: (current?.id ?? 0) + 1, action: 'focus-location', focus: [choice.value.longitude, choice.value.latitude], distanceScale: 0.22 }))
      return
    }
    clearAirSelection()
    setActiveHubStudyIndex(-1)
    setSelectedConnection(undefined)
    if (choice.kind === 'station') {
      selectStation(choice.value)
      return
    }
    setSelectedStation(undefined)
    setSearchOpen(false)
    if (choice.kind === 'route') {
      setSelectedRoute(choice.value)
      setSelectedTrain(undefined)
      setQuery(choice.value.name)
      setCameraCommand((current) => ({ id: (current?.id ?? 0) + 1, action: 'reset' }))
      return
    }
    setSelectedTrain(choice.value)
    setSelectedRoute(undefined)
    setTime(Math.max(choice.value.start, Math.min(time, choice.value.end)))
    setQuery(`${choice.value.shortName} → ${choice.value.headsign}`)
  }, [selectStation, time, selectAirTrack, clearSelection, clearAirSelection, setAirEnabled, setSearchOpen])

  const selectRoute = useCallback((name: string) => {
    clearAirSelection()
    setActiveHubStudyIndex(-1)
    const route = routes.find((candidate) => candidate.name === name)
    setSelectedRoute((current) => current?.id === route?.id ? undefined : route)
    setSelectedStation(undefined)
    setSelectedTrain(undefined)
    setSelectedConnection(undefined)
    setQuery('')
    setSearchOpen(false)
    setCameraCommand((current) => ({ id: (current?.id ?? 0) + 1, action: 'reset' }))
  }, [routes, clearAirSelection, setSearchOpen])

  const showNextConnection = useCallback(() => {
    if (!network) return
    const nextHubStudyIndex = (activeHubStudyIndex + 1) % PARIS_HUB_STUDIES.length
    const hubStudy = PARIS_HUB_STUDIES[nextHubStudyIndex]
    const connection =
      nextConnection(network, time + 15, hubStudy.complexId) ??
      nextConnection(network, network.metadata.windowStart, hubStudy.complexId)
    if (!connection) return
    clearAirSelection()
    setActiveHubStudyIndex(nextHubStudyIndex)
    setScaleView('centre')
    setSelectedConnection(connection)
    setSelectedStation(connection.station)
    setSelectedRoute(undefined)
    setSelectedTrain(undefined)
    setQuery('')
    setSearchOpen(false)
    setTime(connection.arrival)
    setIsPlaying(false)
    setCameraCommand((current) => ({
      id: (current?.id ?? 0) + 1,
      action: 'focus-location',
      focus: [connection.complex.longitude, connection.complex.latitude],
      distanceScale: hubStudy.distanceScale,
    }))
  }, [activeHubStudyIndex, network, time, clearAirSelection, setSearchOpen])

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSearchIndex((index) => Math.min(choices.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSearchIndex((index) => Math.max(0, index - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const choice = choices[activeSearchIndex]
      if (choice) activateChoice(choice)
    } else if (event.key === 'Escape') {
      setSearchOpen(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === ' ') {
        event.preventDefault()
        setIsPlaying((value) => !value)
      } else if (event.key.toLowerCase() === 'f') {
        setLimitedChrome((value) => !value)
      } else if (event.key === 'Escape') {
        if (limitedChrome) setLimitedChrome(false)
        else clearSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearSelection, limitedChrome])

  const hasSelection = Boolean(selectedStation || selectedRoute || selectedTrain || selectedConnection || selectedAirTrackId || selectedAirport || airCategorySelected)
  const comparisonTrains = selectedConnection
    ? [selectedConnection.incoming, selectedConnection.outgoing]
    : []
  const comparisonColors = comparisonTrains.map(
    (train) => CORRESPONDANCES_ROUTE_COLORS[train.route] ?? edition.theme.primary,
  )
  const activeHubStudy = activeHubStudyIndex >= 0
    ? PARIS_HUB_STUDIES[activeHubStudyIndex]
    : undefined
  const activeOptionalLayerCount = Number(centralCrossEnabled) + Number(regionalRerEnabled) + Number(metroArcs.enabled) + Number(metroCrossings.enabled) + Number(metroEast.enabled) + Number(metroBoulevards.enabled) + Number(metroWest.enabled) + Number(metroLocal.enabled) + Number(transilienNorth.enabled) + Number(transilienSaintLazare.enabled) + Number(transilienSouthwest.enabled) + Number(transilienEast.enabled) + Number(tramMarechaux.enabled)
  const optionalLayerLoading = centralCrossLayerLoading || regionalRerLayerLoading || metroArcs.loading || metroCrossings.loading || metroEast.loading || metroBoulevards.loading || metroWest.loading || metroLocal.loading || transilienNorth.loading || transilienSaintLazare.loading || transilienSouthwest.loading || transilienEast.loading || tramMarechaux.loading
  const optionalLayerError = centralCrossLayerError || regionalRerLayerError || metroArcs.error || metroCrossings.error || metroEast.error || metroBoulevards.error || metroWest.error || metroLocal.error || transilienNorth.error || transilienSaintLazare.error || transilienSouthwest.error || transilienEast.error || tramMarechaux.error
  const plannedTripCount = studyWindow === 'day'
    ? (dayStudy.manifest?.tripCount ?? 0) +
      (centralCrossEnabled ? (centralCrossDayStudy.manifest?.tripCount ?? 0) : 0) +
      (regionalRerEnabled ? (regionalRerDayStudy.manifest?.tripCount ?? 0) : 0) + metroArcs.tripCount + metroCrossings.tripCount + metroEast.tripCount + metroBoulevards.tripCount + metroWest.tripCount + metroLocal.tripCount + transilienNorth.tripCount + transilienSaintLazare.tripCount + transilienSouthwest.tripCount + transilienEast.tripCount + tramMarechaux.tripCount
    : (network?.trains.length ?? 0)
  const activeNetworkLabel = [
    'Métro 1',
    'RER A',
    ...(centralCrossEnabled ? ['Métro 4 · 14', 'RER B'] : []),
    ...(regionalRerEnabled ? ['RER C · D · E'] : []),
    ...(metroArcs.enabled ? ['Métro 2 · 6'] : []),
    ...(metroCrossings.enabled ? ['Métro 5 · 7'] : []),
    ...(metroEast.enabled ? ['Métro 3 · 11'] : []),
    ...(metroBoulevards.enabled ? ['Métro 8 · 9'] : []),
    ...(metroWest.enabled ? ['Métro 12 · 13'] : []),
    ...(metroLocal.enabled ? ['Métro 3bis · 7bis · 10'] : []),
    ...(transilienNorth.enabled ? ['Transilien H · K'] : []),
    ...(transilienSaintLazare.enabled ? ['Transilien J · L'] : []),
    ...(transilienSouthwest.enabled ? ['Transilien N · U · V'] : []),
    ...(transilienEast.enabled ? ['Transilien P · R'] : []),
    ...(tramMarechaux.enabled ? ['Tram T3a · T3b'] : []),
  ].join(' · ')

  return (
    <main
      className={`experience view-network correspondances-experience${hasSelection ? ' has-selection' : ''}${limitedChrome ? ' is-limited-chrome' : ''}`}
      data-limited-chrome={limitedChrome}
      data-scale-view={scaleView}
      data-layout-mix={heart.mix.toFixed(3)}
      data-layout-transitioning={heart.transitioning}
      data-metro-arcs-enabled={metroArcs.enabled}
      data-metro-crossings-enabled={metroCrossings.enabled}
      data-metro-east-enabled={metroEast.enabled}
      data-metro-boulevards-enabled={metroBoulevards.enabled}
      data-metro-west-enabled={metroWest.enabled}
      data-metro-local-enabled={metroLocal.enabled}
      data-transilien-north-enabled={transilienNorth.enabled}
      data-transilien-saint-lazare-enabled={transilienSaintLazare.enabled}
      data-transilien-southwest-enabled={transilienSouthwest.enabled}
      data-transilien-east-enabled={transilienEast.enabled}
      data-tram-marechaux-enabled={tramMarechaux.enabled}
      data-air-enabled={air.enabled}
      data-selected-air-track={selectedAirTrackId}
      data-selected-airport={selectedAirport?.id}
    >
      <div className="scene" aria-hidden={webglAvailable ? true : undefined}>
        <Suspense fallback={null}>
          {!webglAvailable ? (
            <section className="no-webgl" role="status">
              <span aria-hidden="true">◉</span>
              <h2>Cette étude nécessite WebGL</h2>
              <p>Ouvrez Correspondances dans un navigateur avec accélération graphique.</p>
            </section>
          ) : network ? (
            <NationalNetworkScene
              boundary={boundary}
              lakes={water}
              referencePaths={references}
              snapshot={network}
              referenceSnapshot={network}
              spatialLayout={heartLayout}
              spatialLayoutMix={heart.mix}
              layoutTransitioning={heart.transitioning}
              stations={stations}
              trainLabelMode={trainLabelMode}
              isPlaying={isPlaying}
              time={time}
              onTime={setTime}
              selectedTrain={selectedTrain}
              comparisonTrains={comparisonTrains}
              comparisonColors={comparisonColors}
              selectedRoute={selectedRoute}
              selectedStation={selectedStation}
              onSelectStation={selectStation}
              cameraCommand={cameraCommand}
              playbackRate={playbackRate}
              cameraFraming={edition.mapFraming}
              routeColors={CORRESPONDANCES_ROUTE_COLORS}
              routeColorMix={1}
              airSnapshot={heart.mix === 0 ? air.snapshot : undefined}
              airCategorySelected={airCategorySelected}
              airports={PARIS_AIRPORTS}
              selectedAirTrack={selectedAirTrack}
              selectedAirport={selectedAirport}
              onSelectAirTrack={selectAirTrack}
              trafficOverviewEmphasis={1}
              stationLabelTierLimit={3}
              stationLabelSettleSeconds={0.42}
            />
          ) : null}
        </Suspense>
      </div>
      <div className="atmosphere" />
      <div className="scanlines" />

      <header className="paris-masthead">
        <div>
          <p>{motionStudyMark(edition.identity)}</p>
          <h1>Correspondances</h1>
          <small>Le centre respire; la région répond.</small>
        </div>
        <aside><span>A Paris motion study</span><small>{activeNetworkLabel} · {studyWindow === 'day' ? '24 heures' : '07:00–09:00'}</small></aside>
      </header>

      <section className="paris-search" aria-label="Rechercher un mouvement">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            const choice = choices[activeSearchIndex]
            if (choice) activateChoice(choice)
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <span className="search-mark" aria-hidden="true" />
          <label>
            <span className="sr-only">Rechercher une station, ligne, mission, aéroport ou avion</span>
            <input
              type="search"
              value={query}
              placeholder={air.enabled ? "CDG, Orly ou un indicatif" : "Châtelet, RER A ou CDG"}
              autoComplete="off"
              aria-controls="paris-search-results"
              aria-expanded={searchOpen && choices.length > 0}
              onFocus={() => { setSearchOpen(true); setLayerMenuOpen(false) }}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveSearchIndex(0)
                setSearchOpen(true)
              }}
              onKeyDown={onSearchKeyDown}
            />
          </label>
          {query && <button type="button" data-tooltip="Effacer la recherche et la sélection" aria-label="Effacer" onClick={clearSelection}>×</button>}
          <nav className="paris-time-switch" aria-label="Durée de l’étude">
            <button type="button" data-tooltip="Rejouer le matin de 07 h à 09 h" aria-label="Étude du matin de deux heures" aria-pressed={studyWindow === 'morning'} onClick={() => activateStudyWindow('morning')}>2H</button>
            <button type="button" data-tooltip="Charger la journée complète et parcourir les 24 heures" aria-label="Étude de vingt-quatre heures" aria-pressed={studyWindow === 'day'} aria-busy={dayStudy.loading} onClick={() => activateStudyWindow('day')}>{dayStudy.loading ? '…' : '24H'}</button>
            <button className="paris-scale-toggle" type="button" data-tooltip={scaleView === 'centre' ? 'Élargir la carte à la région parisienne' : 'Déployer le cœur en gardant les branches régionales'} aria-label="Basculer entre le centre et la région" aria-pressed={scaleView === 'centre'} onClick={toggleScaleView}>{scaleView === 'centre' ? 'RÉGION' : 'CŒUR'}</button>
          </nav>
        </form>
        {searchOpen && query.trim() && (
          <div id="paris-search-results" className="paris-search-results" role="listbox">
            {choices.map((choice, index) => {
              const label = choice.kind === 'airport' ? `${choice.value.name} · ${choice.value.iata}`
                : choice.kind === 'air' ? airTrackSearchValue(choice.value)
                : choice.kind === 'station'
                ? choice.value.name
                : choice.kind === 'route'
                  ? choice.value.name
                  : `${choice.value.shortName} → ${choice.value.headsign}`
              const detail = choice.kind === 'airport' ? 'AÉROPORT'
                : choice.kind === 'air' ? 'AIR · OBSERVÉ'
                : choice.kind === 'station'
                ? 'STATION'
                : choice.kind === 'route'
                  ? `${choice.value.trainIds.length} MISSIONS PLANIFIÉES`
                  : choice.value.route.toUpperCase()
              return (
                <button
                  key={`${choice.kind}:${choice.kind === 'station' ? choice.value.name : choice.value.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeSearchIndex}
                  onMouseEnter={() => setActiveSearchIndex(index)}
                  onClick={() => activateChoice(choice)}
                >
                  <strong>{label}</strong><small>{detail}</small>
                </button>
              )
            })}
            {choices.length === 0 && <p>Aucun mouvement dans cette étude.</p>}
          </div>
        )}
      </section>

      {selectedAirport ? (
        <AirportHeroCard key={selectedAirport.id} className="edition-airport-card"
          airport={selectedAirport} departures={airportMovements.departures} arrivals={airportMovements.arrivals}
          study={{ time: time, windowStart: Math.max(network?.metadata.windowStart ?? 0, air.snapshot?.metadata.windowStart ?? 0), windowEnd: Math.min(network?.metadata.windowEnd ?? 86400, air.snapshot?.metadata.windowEnd ?? 86400) }}
          maxRows={4} dateLabel="04.09.2026" labels={AIRPORT_LABELS['fr']}
          loading={air.boardLoading} error={air.error ? 'AIR indisponible' : undefined}
          onSelectFlight={selectAirTrack} onRetry={air.retry}
          note={<><a href="https://www.adsb.lol/docs/open-data/historical/">ADSB.lol</a> · ODbL · <a href="https://ourairports.com/data/">OurAirports</a> · {AIRPORT_NOTES['fr']}</>}
        />
      ) : (
      <section className={`paris-status${statusExpanded || !network || loadError || dayStudy.error ? ' is-expanded' : ''}`} aria-live="polite">
        {network && !loadError && !dayStudy.error && <>
          <div className="paris-status-count"><strong>{selectedAirTrackId ? (selectedAirPosition ? 1 : 0) : selectedAirport || airCategorySelected ? activeAircraftCount : activeTrainCount}</strong><span>{selectedAirTrackId || selectedAirport || airCategorySelected ? 'avions observés' : 'trains en mouvement'}</span><button className="paris-status-toggle" type="button" aria-label="Détails de l’étude" aria-expanded={statusExpanded} aria-controls="paris-status-details" onClick={() => setStatusExpanded((value) => !value)}>{statusExpanded ? '−' : 'Info'}</button></div>
          <p className="paris-status-context">{selectedAirEntry ? airTrackSearchValue(selectedAirEntry) : (airCategorySelected ? 'Le ciel parisien' : undefined) ?? selectedConnection?.complex.name ?? selectedStation?.name ?? selectedRoute?.name ?? (selectedTrain ? `${selectedTrain.shortName} → ${selectedTrain.headsign}` : scaleView === 'centre' ? 'Le cœur en détail' : 'Deux échelles, une ville')}</p>
        </>}
        <div id="paris-status-details" className="paris-status-details">
          {loadError || dayStudy.error ? <p>Étude indisponible.</p> : network ? (
              <small>{selectedAirTrackId
                ? selectedAirPosition ? `${Math.round(selectedAirPosition.altitudeFeet).toLocaleString('fr-FR')} ft · ${Math.round(selectedAirPosition.groundSpeedKnots)} kt · altitude comprimée` : 'Aucune position observée à cet instant'
                : selectedAirport ? 'Présence dans l’enveloppe d’approche · liaison inférée'
                : selectedConnection
                ? `${activeHubStudy?.description ?? 'correspondance planifiée'} · ${selectedConnection.incoming.route} → ${selectedConnection.outgoing.route} · ${Math.round((selectedConnection.departure - selectedConnection.arrival) / 60)} min disponibles · ${Math.round(selectedConnection.minimumTransferSeconds / 60)} min minimum publié`
                : selectedStation
                ? `${selectedStation.trainIds.length} passages planifiés dans l’étude`
                : selectedRoute
                  ? `${selectedRoute.trainIds.length} missions · ${selectedRoute.stopIndexes.length} stations`
                  : selectedTrain
                    ? `${selectedTrain.route} · ${formatServiceTime(selectedTrain.start)}–${formatServiceTime(selectedTrain.end)}`
                    : optionalLayerLoading
                      ? 'Les couches choisies se chargent séparément…'
                      : optionalLayerError
                        ? 'Une couche est indisponible · le socle reste actif'
                        : `${plannedTripCount} missions planifiées · ${activeOptionalLayerCount ? `${activeOptionalLayerCount} couche${activeOptionalLayerCount > 1 ? 's' : ''} active${activeOptionalLayerCount > 1 ? 's' : ''} · ` : ''}pas de temps réel`}</small>
          ) : <p>Paris se dessine…</p>}
          {scaleView === 'centre' && <aside className="paris-heart-note">
            <span>Plan à échelle variable</span>
            {metroArcs.enabled
              ? <span>{metroArcs.loading ? 'Les arcs se dessinent…' : 'Métro 2 au nord · Métro 6 au sud'}</span>
              : <button type="button" onClick={revealHeartArcs}>{metroArcs.error ? 'Réessayer les arcs · 2 et 6' : 'Révéler les arcs · Métro 2 et 6'}</button>}
          </aside>}
          {air.enabled && <div className="paris-air-note" role="status">
            <span>{air.error ? 'AIR indisponible · le rail reste actif' : air.loading ? 'AIR se charge…' : scaleView === 'centre' ? 'AIR · visible en Région' : `AIR · ${activeAircraft.length} avions observés`}</span>
            {air.error && <button type="button" onClick={air.retry}>Réessayer AIR</button>}
            <span><a href="https://www.adsb.lol/docs/open-data/historical/" target="_blank" rel="noreferrer">ADSB.lol</a> · 04.09.2026 · <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL</a></span>
          </div>}
        </div>
      </section>
      )}

      <nav className="paris-routes" aria-label="Lignes de l’étude">
        <button type="button" data-tooltip="Mettre en évidence le Métro 1 et ses missions" aria-label="Isoler Métro 1" aria-pressed={selectedRoute?.name === 'Métro 1'} onClick={() => selectRoute('Métro 1')}><i /> Métro 1 <small>le centre</small></button>
        <button type="button" data-tooltip="Mettre en évidence le RER A et ses missions" aria-label="Isoler RER A" aria-pressed={selectedRoute?.name === 'RER A'} onClick={() => selectRoute('RER A')}><i /> RER A <small>la région</small></button>
        <button className="paris-layer-button" type="button" data-tooltip={layerMenuOpen ? 'Fermer le choix des réseaux' : 'Choisir les réseaux ferroviaires et isoler AIR'} aria-label="Afficher les couches" aria-expanded={layerMenuOpen} onClick={() => { setSearchOpen(false); setLayerMenuOpen((open) => !open) }}><i /> Couches <small>{activeOptionalLayerCount ? `${activeOptionalLayerCount} active${activeOptionalLayerCount > 1 ? 's' : ''}` : 'réseau optionnel'}</small></button>
        <button className="paris-air-toggle" type="button" data-tooltip={air.enabled ? 'Masquer les avions observés' : 'Afficher les avions observés sur la même horloge que les trains'} aria-label="AIR — avions observés" aria-pressed={air.enabled} aria-busy={air.loading} onClick={() => { clearSelection(); setAirEnabled(!air.enabled); if (!air.enabled) moveCamera('reset') }}><i /> AIR <small>observé</small></button>
        <button className="paris-connection-button" type="button" data-tooltip="Passer au prochain pôle et explorer ses correspondances programmées" aria-label="Prochaine correspondance" onClick={showNextConnection}><i /> <span className="paris-connection-title">{activeHubStudy?.title ?? 'Correspondance'}</span><span className="paris-connection-short" aria-hidden="true">Hubs</span> <small>{activeHubStudy ? selectedConnection?.complex.name : '3 hubs · données IDFM'}</small></button>
      </nav>

      {layerMenuOpen && (
        <section className="paris-layer-menu" aria-label="Couches du réseau">
          <button type="button" data-tooltip={centralCrossEnabled ? 'Masquer les lignes Métro 4, Métro 14 et RER B' : 'Ajouter les lignes Métro 4, Métro 14 et RER B'} aria-label="Couche nord–sud Métro 4, Métro 14 et RER B" aria-pressed={centralCrossEnabled} aria-busy={centralCrossLayerLoading} onClick={toggleCentralCross}><i className="central-cross" /> <span><strong>{centralCrossLayerLoading ? 'Chargement…' : 'Croisée nord–sud'}</strong><small>Métro 4 · Métro 14 · RER B</small></span></button>
          <button type="button" data-tooltip={regionalRerEnabled ? 'Masquer les lignes RER C, RER D et RER E' : 'Ajouter les lignes RER C, RER D et RER E'} aria-label="Couche régionale RER C, RER D et RER E" aria-pressed={regionalRerEnabled} aria-busy={regionalRerLayerLoading} onClick={toggleRegionalRer}><i className="regional-rer" /> <span><strong>{regionalRerLayerLoading ? 'Chargement…' : 'Région étendue'}</strong><small>RER C · RER D · RER E</small></span></button>
          <button type="button" data-tooltip={metroArcs.error ? 'Réessayer les arcs du Métro' : metroArcs.enabled ? 'Masquer les lignes Métro 2 et Métro 6' : 'Ajouter les arcs nord et sud autour du centre'} aria-label="Couche arcs du Métro 2 et Métro 6" aria-pressed={metroArcs.enabled} aria-busy={metroArcs.loading} onClick={toggleMetroArcs}><i className="metro-arcs" /><span><strong>{metroArcs.error ? 'Réessayer les arcs' : metroArcs.loading ? 'Chargement…' : 'Arcs du Métro'}</strong><small>Métro 2 · Métro 6</small></span></button>
          <button type="button" data-tooltip={metroCrossings.error ? 'Réessayer les traversées du Métro' : metroCrossings.enabled ? 'Masquer les lignes Métro 5 et Métro 7' : 'Ajouter les traversées du Métro 5 et du Métro 7'} aria-label="Couche traversées du Métro 5 et Métro 7" aria-pressed={metroCrossings.enabled} aria-busy={metroCrossings.loading} onClick={toggleMetroCrossings}><i className="metro-crossings" /><span><strong>{metroCrossings.error ? 'Réessayer les traversées' : metroCrossings.loading ? 'Chargement…' : 'Traversées du Métro'}</strong><small>Métro 5 · Métro 7</small></span></button>
          <button type="button" data-tooltip={metroEast.error ? 'Réessayer les portes de l’Est' : metroEast.enabled ? 'Masquer les lignes Métro 3 et Métro 11' : 'Ajouter les liaisons du Métro vers l’est'} aria-label="Couche portes de l’Est Métro 3 et Métro 11" aria-pressed={metroEast.enabled} aria-busy={metroEast.loading} onClick={toggleMetroEast}><i className="metro-east" /><span><strong>{metroEast.error ? 'Réessayer les portes' : metroEast.loading ? 'Chargement…' : 'Portes de l’Est'}</strong><small>Métro 3 · Métro 11</small></span></button>
          <button type="button" data-tooltip={metroBoulevards.error ? 'Réessayer cette couche' : metroBoulevards.enabled ? 'Masquer cette couche' : 'Ajouter cette couche'} aria-label="Couche grands boulevards Métro 8 et Métro 9" aria-pressed={metroBoulevards.enabled} aria-busy={metroBoulevards.loading} onClick={toggleMetroBoulevards}><i className="metro-boulevards" /><span><strong>{metroBoulevards.error ? 'Réessayer la couche' : metroBoulevards.loading ? 'Chargement…' : 'Grands boulevards'}</strong><small>Métro 8 · Métro 9</small></span></button>
          <button type="button" data-tooltip={metroWest.error ? 'Réessayer cette couche' : metroWest.enabled ? 'Masquer cette couche' : 'Ajouter cette couche'} aria-label="Couche axes de l’Ouest Métro 12 et Métro 13" aria-pressed={metroWest.enabled} aria-busy={metroWest.loading} onClick={toggleMetroWest}><i className="metro-west" /><span><strong>{metroWest.error ? 'Réessayer la couche' : metroWest.loading ? 'Chargement…' : 'Axes de l’Ouest'}</strong><small>Métro 12 · Métro 13</small></span></button>
          <button type="button" data-tooltip={metroLocal.error ? 'Réessayer cette couche' : metroLocal.enabled ? 'Masquer cette couche' : 'Ajouter cette couche'} aria-label="Couche boucles et liaisons Métro 3bis, Métro 7bis et Métro 10" aria-pressed={metroLocal.enabled} aria-busy={metroLocal.loading} onClick={toggleMetroLocal}><i className="metro-local" /><span><strong>{metroLocal.error ? 'Réessayer la couche' : metroLocal.loading ? 'Chargement…' : 'Boucles et liaisons'}</strong><small>Métro 3bis · Métro 7bis · Métro 10</small></span></button>
          <button type="button" data-tooltip={transilienNorth.error ? 'Réessayer Transilien Nord' : transilienNorth.enabled ? 'Masquer Transilien Nord' : 'Ajouter Transilien Nord'} aria-label="Couche Transilien H, K" aria-pressed={transilienNorth.enabled} aria-busy={transilienNorth.loading} onClick={toggleTransilienNorth}><i className="transilien-north" /><span><strong>{transilienNorth.error ? 'Réessayer Transilien' : transilienNorth.loading ? 'Chargement…' : 'Nord'}</strong><small>Transilien H · K</small></span></button>
          <button type="button" data-tooltip={transilienSaintLazare.error ? 'Réessayer Transilien Saint-Lazare' : transilienSaintLazare.enabled ? 'Masquer Transilien Saint-Lazare' : 'Ajouter Transilien Saint-Lazare'} aria-label="Couche Transilien J, L" aria-pressed={transilienSaintLazare.enabled} aria-busy={transilienSaintLazare.loading} onClick={toggleTransilienSaintLazare}><i className="transilien-saint-lazare" /><span><strong>{transilienSaintLazare.error ? 'Réessayer Transilien' : transilienSaintLazare.loading ? 'Chargement…' : 'Saint-Lazare'}</strong><small>Transilien J · L</small></span></button>
          <button type="button" data-tooltip={transilienSouthwest.error ? 'Réessayer Transilien Sud-ouest' : transilienSouthwest.enabled ? 'Masquer Transilien Sud-ouest' : 'Ajouter Transilien Sud-ouest'} aria-label="Couche Transilien N, U, V" aria-pressed={transilienSouthwest.enabled} aria-busy={transilienSouthwest.loading} onClick={toggleTransilienSouthwest}><i className="transilien-southwest" /><span><strong>{transilienSouthwest.error ? 'Réessayer Transilien' : transilienSouthwest.loading ? 'Chargement…' : 'Sud-ouest'}</strong><small>Transilien N · U · V</small></span></button>
          <button type="button" data-tooltip={transilienEast.error ? 'Réessayer Transilien Est et sud-est' : transilienEast.enabled ? 'Masquer Transilien Est et sud-est' : 'Ajouter Transilien Est et sud-est'} aria-label="Couche Transilien P, R" aria-pressed={transilienEast.enabled} aria-busy={transilienEast.loading} onClick={toggleTransilienEast}><i className="transilien-east" /><span><strong>{transilienEast.error ? 'Réessayer Transilien' : transilienEast.loading ? 'Chargement…' : 'Est et sud-est'}</strong><small>Transilien P · R</small></span></button>
          <button type="button" data-tooltip={tramMarechaux.error ? 'Réessayer le tram des Maréchaux' : tramMarechaux.enabled ? 'Masquer le tram des Maréchaux' : 'Ajouter le tram des Maréchaux'} aria-label="Couche tram des Maréchaux T3a et T3b" aria-pressed={tramMarechaux.enabled} aria-busy={tramMarechaux.loading} onClick={toggleTramMarechaux}><i className="tram-marechaux" /><span><strong>{tramMarechaux.error ? 'Réessayer le tram' : tramMarechaux.loading ? 'Chargement…' : 'Tram des Maréchaux'}</strong><small>Tram T3a · T3b</small></span></button>
          {air.enabled && <button type="button" data-tooltip={airCategorySelected ? 'Rétablir la visibilité du réseau ferroviaire' : 'Mettre les avions en évidence et atténuer les trains'} aria-label="Isoler les avions observés" aria-pressed={airCategorySelected} onClick={() => { const next = !airCategorySelected; clearSelection(); setAirCategorySelected(next); setLayerMenuOpen(false); if (next) moveCamera('reset') }}><i className="air" /><span><strong>Isoler AIR</strong><small>Atténuer le réseau ferroviaire</small></span></button>}
        </section>
      )}

      <aside className="paris-map-tools" aria-label="Contrôles de la carte">
        <button type="button" aria-label="Zoom avant" onClick={() => moveCamera('zoom-in')}>+</button>
        <button type="button" aria-label="Zoom arrière" onClick={() => moveCamera('zoom-out')}>−</button>
        <button type="button" aria-label="Réinitialiser la carte" onClick={() => { clearSelection(); moveCamera('reset') }}>↺</button>
        <button type="button" data-tooltip={trainLabelMode === 'off' ? 'Afficher automatiquement les libellés des véhicules selon le zoom' : 'Masquer les libellés des véhicules'} aria-label={`Libellés ${trainLabelMode}`} onClick={() => setTrainLabelMode((value) => value === 'off' ? 'auto' : 'off')}>L·{trainLabelMode === 'off' ? '0' : 'A'}</button>
      </aside>

      {network && (
        <section className="paris-transport" aria-label="Lecture">
          <div><span>{formatWindowBoundary(network.metadata.windowStart)}</span><strong>{formatServiceTime(time)}</strong><span>{formatWindowBoundary(network.metadata.windowEnd)}</span></div>
          <label><span className="sr-only">Heure</span><input type="range" min={network.metadata.windowStart} max={network.metadata.windowEnd} step="10" value={time} onChange={(event) => setTime(Number(event.target.value))} /></label>
          <aside>
            <button type="button" aria-label={isPlaying ? 'Pause' : 'Lecture'} onClick={() => setIsPlaying((value) => !value)}>{isPlaying ? 'Ⅱ' : '▶'}</button>
            <select aria-label="Vitesse" value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))}>{PLAYBACK_RATES.map((rate) => <option key={rate.value} value={rate.value}>{rate.label}</option>)}</select>
            <button type="button" data-tooltip={limitedChrome ? 'Rétablir les panneaux et les commandes' : 'Masquer les panneaux pour se concentrer sur la carte'} aria-label={limitedChrome ? 'Afficher les commandes' : 'Plein écran'} aria-pressed={limitedChrome} onClick={() => setLimitedChrome((value) => !value)}>{limitedChrome ? '×' : '⛶'}</button>
            {hasSelection && <button type="button" data-tooltip="Effacer la sélection et arrêter le suivi pour explorer librement la carte" onClick={clearSelection}>Libérer</button>}
          </aside>
        </section>
      )}

      <footer className="paris-footer">
        <span><a href="https://prim.iledefrance-mobilites.fr/fr/jeux-de-donnees/offre-horaires-tc-gtfs-idfm" target="_blank" rel="noreferrer">IDFM GTFS</a> · <a href="https://opendata.paris.fr/explore/dataset/plan-de-voirie-voies-deau/" target="_blank" rel="noreferrer">Seine · Ville de Paris</a> · {studyWindow === 'day' ? 'progressive 24H' : '07:00–09:00'}</span>
        <span>Scheduled interpolation · <a href="https://www.iledefrance-mobilites.fr/medias/portail-idfm/4dc136f7-df23-449b-9670-24bc5254a706_RAA138.pdf" target="_blank" rel="noreferrer">Licence Mobilité</a> · water ODbL</span>
      </footer>
    </main>
  )
}
