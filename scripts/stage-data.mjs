import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
const files = new Set(["correspondances-morning.json", "correspondances-geography.json", "correspondances-central-cross-morning.json", "correspondances-regional-rer-morning.json"])
for (const manifest of ["correspondances-day-manifest.json", "correspondances-central-cross-day-manifest.json", "correspondances-regional-rer-day-manifest.json"]) {
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
