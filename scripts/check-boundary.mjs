import { checkEditionBoundary } from '@motionstudies/data/edition-boundary'

await checkEditionBoundary({ directories: ['src', 'scripts'] })
console.log('correspondances uses pinned npm releases and declared public imports.')
