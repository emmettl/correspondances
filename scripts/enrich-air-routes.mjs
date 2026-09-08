import { enrichAirEndpoints } from '@motionstudies/data/air-endpoints'

const [heatmapDirectory, airportCsvPath] = process.argv.slice(2)
if (!heatmapDirectory || !airportCsvPath) throw new Error('Usage: npm run data:air:routes -- /path/to/cached-heatmaps /path/to/airports.csv')
console.log(await enrichAirEndpoints({
  manifestPath: 'fixtures/adsb/correspondances-air-day-manifest.json',
  snapshotPaths: ['fixtures/adsb/correspondances-air-morning.json'],
  heatmapDirectory, airportCsvPath, utcOffsetHours: 2,
}))
