import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { importShow } from '../lib/tmdb'

// The Bear (136315), Severance (95396), Black Mirror (42009)
const SHOW_IDS = [136315, 95396, 42009]

async function seed() {
  console.log('Seeding database...')
  for (const id of SHOW_IDS) {
    console.log(`Importing TMDb show ${id}...`)
    try {
      const showId = await importShow(id)
      console.log(`  ✓ id=${showId}`)
    } catch (err) {
      console.error(`  ✗ Failed:`, err)
    }
  }
  console.log('Done.')
  process.exit(0)
}

seed()
