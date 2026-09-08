import type { MapCameraFraming } from '@motionstudies/three/map-camera'
import type { VisualTheme } from '@motionstudies/core/theme'
import { CORRESPONDANCES_STUDY } from './catalogue.ts'
import type { EditionDataCatalog, MotionStudyEdition } from '@motionstudies/core/edition'

const CORRESPONDANCES_THEME = {
  background: '#07040d',
  ink: '#fff9f1',
  muted: 'rgba(238, 224, 241, 0.58)',
  line: 'rgba(225, 193, 255, 0.17)',
  primary: '#f4cf55',
  secondary: '#ef4b68',
  panel: 'rgba(12, 5, 18, 0.76)',
  air: '#f06fca',
  roadLight: '#ffe6b0',
  roadHeavy: '#ff9f59',
} satisfies VisualTheme

/**
 * The source feed carries the official identifiers and line colours. These
 * slightly lifted variants remain legible in the dark Motion Studies palette.
 */
export const CORRESPONDANCES_ROUTE_COLORS: Readonly<Record<string, string>> = {
  'Tram T3a': '#ff9754',
  'Tram T3b': '#59bb8e',
  'Métro 1': '#ffd75d',
  'Métro 2': '#659bff',
  'Métro 3': '#c6c674',
  'Métro 8': '#df9fd0',
  'Métro 9': '#e4e66e',
  'Métro 12': '#59bb8e',
  'Métro 13': '#a0dbed',
  'Métro 3bis': '#a0dbed',
  'Métro 7bis': '#9be78a',
  'Métro 10': '#e9b954',
  'Métro 11': '#c19465',
  'Métro 6': '#9be78a',
  'Métro 5': '#ff9754',
  'Métro 7': '#ff99bf',
  'Métro 4': '#d86bc7',
  'Métro 14': '#9b79ff',
  'Transilien H': '#b99a72',
  'Transilien K': '#c6c36d',
  'Transilien J': '#e2dc64',
  'Transilien L': '#d7b7df',
  'Transilien N': '#4bd2b9',
  'Transilien P': '#ffa575',
  'Transilien R': '#ffb0c4',
  'Transilien U': '#ec5488',
  'Transilien V': '#c8c150',
  'RER A': '#ff4e70',
  'RER B': '#65b5ff',
  'RER C': '#ffd85e',
  'RER D': '#55cf9b',
  'RER E': '#d86fcb',
}

export interface ParisDataCatalog extends EditionDataCatalog {
  readonly opening: {
    readonly network: string
    readonly geography: string
    readonly dayManifest: string
  }
  readonly air: {
    readonly morning: string
    readonly dayManifest: string
  }
  readonly layers: {
    readonly centralCrossMorning: string
    readonly centralCrossDayManifest: string
    readonly regionalRerMorning: string
    readonly regionalRerDayManifest: string
    readonly metroArcsMorning: string
    readonly metroArcsDayManifest: string
    readonly metroCrossingsMorning: string
    readonly metroCrossingsDayManifest: string
    readonly metroEastMorning: string
    readonly metroEastDayManifest: string
    readonly metroBoulevardsMorning: string
    readonly metroBoulevardsDayManifest: string
    readonly metroWestMorning: string
    readonly metroWestDayManifest: string
    readonly transilienNorthMorning: string
    readonly transilienNorthDayManifest: string
    readonly transilienSaintLazareMorning: string
    readonly transilienSaintLazareDayManifest: string
    readonly transilienSouthwestMorning: string
    readonly transilienSouthwestDayManifest: string
    readonly transilienEastMorning: string
    readonly transilienEastDayManifest: string
    readonly tramMarechauxMorning: string
    readonly tramMarechauxDayManifest: string
    readonly metroLocalMorning: string
    readonly metroLocalDayManifest: string
  }
}

export type ParisEdition = MotionStudyEdition<ParisDataCatalog> & {
  readonly mapFraming: MapCameraFraming
}

export const PARIS_EDITION: ParisEdition = {
  id: 'paris',
  identity: CORRESPONDANCES_STUDY,
  timezone: 'Europe/Paris',
  languageStorageKey: 'correspondances-language',
  defaultNetworkTime: 8 * 3600,
  mapFraming: {
    homeDistanceScale: 1.12,
    minimumDistanceScale: 0.018,
  },
  theme: CORRESPONDANCES_THEME,
  data: {
    opening: {
      network: 'correspondances-morning.json',
      geography: 'correspondances-geography.json',
      dayManifest: 'correspondances-day-manifest.json',
    },
    air: {
      morning: 'correspondances-air-morning.json',
      dayManifest: 'correspondances-air-day-manifest.json',
    },
    layers: {
      centralCrossMorning: 'correspondances-central-cross-morning.json',
      centralCrossDayManifest: 'correspondances-central-cross-day-manifest.json',
      regionalRerMorning: 'correspondances-regional-rer-morning.json',
      regionalRerDayManifest: 'correspondances-regional-rer-day-manifest.json',
      metroArcsMorning: 'correspondances-metro-arcs-morning.json',
      metroArcsDayManifest: 'correspondances-metro-arcs-day-manifest.json',
      metroCrossingsMorning: 'correspondances-metro-crossings-morning.json',
      metroCrossingsDayManifest: 'correspondances-metro-crossings-day-manifest.json',
      metroEastMorning: 'correspondances-metro-east-morning.json',
      metroEastDayManifest: 'correspondances-metro-east-day-manifest.json',
      metroBoulevardsMorning: 'correspondances-metro-boulevards-morning.json',
      metroBoulevardsDayManifest: 'correspondances-metro-boulevards-day-manifest.json',
      metroWestMorning: 'correspondances-metro-west-morning.json',
      metroWestDayManifest: 'correspondances-metro-west-day-manifest.json',
      transilienNorthMorning: 'correspondances-transilien-north-morning.json',
      transilienNorthDayManifest: 'correspondances-transilien-north-day-manifest.json',
      transilienSaintLazareMorning: 'correspondances-transilien-saint-lazare-morning.json',
      transilienSaintLazareDayManifest: 'correspondances-transilien-saint-lazare-day-manifest.json',
      transilienSouthwestMorning: 'correspondances-transilien-southwest-morning.json',
      transilienSouthwestDayManifest: 'correspondances-transilien-southwest-day-manifest.json',
      transilienEastMorning: 'correspondances-transilien-east-morning.json',
      transilienEastDayManifest: 'correspondances-transilien-east-day-manifest.json',
      tramMarechauxMorning: 'correspondances-tram-marechaux-morning.json',
      tramMarechauxDayManifest: 'correspondances-tram-marechaux-day-manifest.json',
      metroLocalMorning: 'correspondances-metro-local-morning.json',
      metroLocalDayManifest: 'correspondances-metro-local-day-manifest.json',
    },
  },
}
