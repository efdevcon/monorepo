import 'dotenv/config'
import { SERVER_CONFIG } from '@/utils/config'
import { SyncNocoDbTable } from '@/controllers/hooks'

async function main() {
  const tables = SERVER_CONFIG.NOCODB_TABLES
  const tableIds = Object.keys(tables)

  if (tableIds.length === 0) {
    console.error('No tables configured in NOCODB_TABLES env var')
    process.exit(1)
  }

  console.log(`Syncing ${tableIds.length} NocoDB tables...`)

  for (const tableId of tableIds) {
    const name = tables[tableId]
    try {
      const result = await SyncNocoDbTable(tableId, name)
      console.log(`  ${name}: ${result.rows} rows, changed=${result.changed}`)
    } catch (err) {
      console.error(`  ${name}: failed —`, err instanceof Error ? err.message : err)
    }
  }
}

main().catch(err => {
  console.error('sync-nocodb failed:', err)
  process.exit(1)
})
