import type { StudyAirport } from '@motionstudies/core/domain/airport'
import catalogue from '../../fixtures/adsb/correspondances-airports.json'

export const PARIS_AIRPORTS = catalogue satisfies readonly StudyAirport[]
