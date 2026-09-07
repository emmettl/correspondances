import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { buildStationIndex } from '@motionstudies/core/domain/network'
// Exercise the same private alpha.2 helper used by the checked renderer adapter.
import { rankStationsForLabels } from '../node_modules/@motionstudies/three/station-labels.js'
import {
  PARIS_STATION_LABEL_GROUPS,
  parisStationLabels,
  parisStationLabelEligible,
} from '../src/editions/paris-station-labels.ts'

const snapshots = ['morning', 'central-cross-morning', 'regional-rer-morning', 'metro-arcs-morning', 'metro-crossings-morning']
  .map((name) => JSON.parse(readFileSync(`fixtures/idfm/correspondances-${name}.json`, 'utf8')))
const stations = [...new Map(snapshots.flatMap(buildStationIndex).map((station) => [station.name, station])).values()]

test('editorial names resolve in the study and preserve source ranks and fallback order', () => {
  const names = Object.values(PARIS_STATION_LABEL_GROUPS).flat()
  expect(new Set(names).size).toBe(names.length)
  expect(names.filter((name) => !stations.some((station) => station.name === name))).toEqual([])
  const sourceOrder = rankStationsForLabels(stations)
  const before = structuredClone(sourceOrder)
  const ordered = parisStationLabels(sourceOrder)
  expect(ordered.slice(0, names.length).map(({ name }) => name)).toEqual(names)
  expect(ordered.slice(names.length)).toEqual(sourceOrder.filter(({ name }) => !names.includes(name)))
  expect(sourceOrder).toEqual(before)
  for (const station of ordered) expect(station).toBe(stations.find(({ name }) => name === station.name))
})

test('zoom admits overview, interchanges and then all local stations without a global rank cutoff', () => {
  const ordered = parisStationLabels(rankStationsForLabels(stations))
  const admitted = (height) => ordered.filter((station) => parisStationLabelEligible(station, height))
  expect(admitted(37).map(({ name }) => name)).toEqual(PARIS_STATION_LABEL_GROUPS.overview)
  const austerlitz = stations.find(({ name }) => name === "Gare d'Austerlitz")
  const bastille = stations.find(({ name }) => name === 'Bastille')
  expect(austerlitz.labelRank).toBe(3)
  expect(parisStationLabelEligible(austerlitz, 37)).toBe(true)
  expect(parisStationLabelEligible(bastille, 22)).toBe(true)
  expect(admitted(15).some(({ name }) => name === 'Tuileries')).toBe(false)
  expect(admitted(14.9)).toEqual(ordered)
  expect(ordered.length).toBeGreaterThan(96)
  expect(admitted(14.9)).toContain(ordered.at(-1))
  expect(parisStationLabelEligible(bastille, 5, 2)).toBe(false)
  expect(parisStationLabelEligible({ name: 'New local station' }, 5)).toBe(true)
})
