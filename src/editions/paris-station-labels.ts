import type { StationIndexEntry } from '@motionstudies/core/domain/network'

/** Editorial orientation points, using exact names from the Paris station index.
 * These groups control label admission and order, without changing source ranks.
 */
export const PARIS_STATION_LABEL_GROUPS = {
  overview: [
    'Châtelet', 'Gare de Lyon', 'La Défense', 'Gare du Nord',
    'Saint-Lazare', 'Montparnasse Bienvenue', 'Nation',
    'Charles de Gaulle - Étoile', "Gare de l'Est", "Gare d'Austerlitz",
    'Châtelet - Les Halles', 'Haussmann Saint-Lazare',
  ],
  interchanges: [
    'Saint-Michel Notre-Dame', 'Denfert-Rochereau', 'Bastille', 'République',
    'Concorde', 'Auber', 'Opéra', 'Invalides', 'Bibliothèque François Mitterrand',
    "Place d'Italie", 'Bercy', 'Porte Maillot', 'Neuilly - Porte Maillot',
    'Palais Royal - Musée du Louvre', 'Hôtel de Ville', 'Trocadéro',
    'Stalingrad', 'Barbès - Rochechouart', 'Belleville',
    'Saint-Denis - Pleyel', 'Val de Fontenay', 'Massy - Palaiseau',
    'Juvisy', 'Versailles Chantiers',
  ],
} as const

const overviewNames = new Set<string>(PARIS_STATION_LABEL_GROUPS.overview)
const editorialOrder = new Map<string, number>([
  ...PARIS_STATION_LABEL_GROUPS.overview,
  ...PARIS_STATION_LABEL_GROUPS.interchanges,
].map((name, index) => [name, index]))

export function parisStationPriority(name: string): number {
  return editorialOrder.get(name) ?? editorialOrder.size
}

/** Input is already ranked by the renderer; stable sorting preserves its fallback. */
export function parisStationLabels(stations: readonly StationIndexEntry[]): StationIndexEntry[] {
  return [...stations].sort((first, second) =>
    parisStationPriority(first.name) - parisStationPriority(second.name),
  )
}

export function parisStationLabelEligible(
  station: Pick<StationIndexEntry, 'name' | 'labelRank'>,
  cameraHeight: number,
  tierLimit = 3,
): boolean {
  // Explicit renderer limits still apply to source tiers. Editorial groups may
  // promote a tier-3 interchange at city scale without rewriting that source tier.
  if ((station.labelRank ?? 3) > tierLimit) return false
  if (cameraHeight >= 30) return overviewNames.has(station.name)
  if (cameraHeight >= 15) return editorialOrder.has(station.name) || (station.labelRank ?? 3) <= 2
  // At neighbourhood scale every on-screen station can compete for label space.
  return true
}
