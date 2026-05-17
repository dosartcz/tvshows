import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { importShow } from '../lib/tmdb'

importShow(136315)
  .then(id => { console.log('The Bear imported, id=' + id); process.exit(0) })
  .catch(e => { console.error(e); process.exit(1) })
