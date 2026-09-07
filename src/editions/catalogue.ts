import type { MotionStudyIdentity } from '@motionstudies/core/edition'

export type MotionStudyStatus = 'released' | 'foundation' | 'planned'

export interface MotionStudyCatalogueEntry extends MotionStudyIdentity {
  readonly status: MotionStudyStatus
}

export const CORRESPONDANCES_STUDY = {
  series: 'Motion Studies',
  catalogueNumber: '008',
  title: 'Correspondances',
  placeName: 'Paris',
  descriptor: 'A Paris motion study',
  status: 'foundation',
} as const satisfies MotionStudyCatalogueEntry

export function motionStudyMark(identity: MotionStudyIdentity): string {
  return `${identity.series.toUpperCase()} · ${identity.catalogueNumber}`
}
