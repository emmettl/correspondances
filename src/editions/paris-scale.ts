/** Paris keeps place names ahead of individual mission labels at city scale. */
export function parisOverviewMix(cameraHeight: number): number {
  const progress = Math.min(1, Math.max(0, (cameraHeight - 10) / 22))
  return progress * progress * (3 - 2 * progress)
}

export function parisTrainLabelBudget(height: number, width: number, mode: string): number {
  if (mode === 'off' || height >= 5) return 0
  return width <= 600 ? 3 : 8
}

export function parisTrainLabelHeight(width: number, selected: boolean): number {
  return selected ? 34 : width <= 600 ? 26 : 30
}

export function parisStationLabelHeight(width: number, selected: boolean, rank?: number): number {
  if (width > 600) return selected ? 44 : rank === 1 ? 38 : 32
  return selected ? 36 : rank === 1 ? 32 : 28
}

const PARIS_ORIENTATION_HUBS = ['Châtelet', 'Gare de Lyon', 'La Défense', 'Gare du Nord']

export function parisStationPriority(name: string): number {
  const index = PARIS_ORIENTATION_HUBS.indexOf(name)
  return index < 0 ? PARIS_ORIENTATION_HUBS.length : index
}
