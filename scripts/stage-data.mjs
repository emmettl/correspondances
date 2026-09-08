import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
const files = new Set(["correspondances-morning.json", "correspondances-geography.json", "correspondances-central-cross-morning.json", "correspondances-regional-rer-morning.json", "correspondances-metro-arcs-morning.json", "correspondances-metro-crossings-morning.json", "correspondances-metro-east-morning.json", "correspondances-metro-boulevards-morning.json", "correspondances-metro-west-morning.json", "correspondances-metro-local-morning.json", "correspondances-transilien-north-morning.json", "correspondances-transilien-saint-lazare-morning.json", "correspondances-transilien-southwest-morning.json", "correspondances-transilien-east-morning.json", "correspondances-tram-marechaux-morning.json"])
for (const manifest of ["correspondances-day-manifest.json", "correspondances-central-cross-day-manifest.json", "correspondances-regional-rer-day-manifest.json", "correspondances-metro-arcs-day-manifest.json", "correspondances-metro-crossings-day-manifest.json", "correspondances-metro-east-day-manifest.json", "correspondances-metro-boulevards-day-manifest.json", "correspondances-metro-west-day-manifest.json", "correspondances-metro-local-day-manifest.json", "correspondances-transilien-north-day-manifest.json", "correspondances-transilien-saint-lazare-day-manifest.json", "correspondances-transilien-southwest-day-manifest.json", "correspondances-transilien-east-day-manifest.json", "correspondances-tram-marechaux-day-manifest.json"]) {
  files.add(manifest)
  const data = JSON.parse(await readFile(`fixtures/idfm/${manifest}`, 'utf8'))
  for (const { path } of data.chunks) files.add(path)
}
for (const file of files) {
  const output = `public/data/${file}`
  await mkdir(dirname(output), { recursive: true })
  await copyFile(`fixtures/idfm/${file}`, output)
}
console.log(`Staged ${files.size} edition artifacts.`)

const airFiles = new Set(['correspondances-air-morning.json', 'correspondances-air-day-manifest.json'])
const airManifest = JSON.parse(await readFile('fixtures/adsb/correspondances-air-day-manifest.json', 'utf8'))
for (const { path } of airManifest.chunks) airFiles.add(path)
for (const file of airFiles) await copyFile(`fixtures/adsb/${file}`, `public/data/${file}`)
console.log(`Staged ${airFiles.size} optional Paris AIR artifacts.`)
