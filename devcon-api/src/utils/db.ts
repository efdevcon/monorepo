import { Pool, PoolConfig } from 'pg'
import { SERVER_CONFIG } from '@/utils/config'

let dbPool: Pool

export const DB_POOL_CONFIG: PoolConfig = {
  connectionString: SERVER_CONFIG.DB_CONNECTION_STRING,
  ssl:
    SERVER_CONFIG.NODE_ENV === 'production'
      ? true
      : {
          rejectUnauthorized: false,
        },
  max: 20,
}

export function getDbPool() {
  if (!dbPool) {
    dbPool = new Pool(DB_POOL_CONFIG)

    dbPool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })
  }

  return dbPool
}

export async function verify() {
  const pool = getDbPool()

  try {
    const result = await pool.query('SELECT NOW()')
    console.log('Db Connection established:', result.rows[0].now)
  } catch (err) {
    console.error('Error verifying database connection', err)
  }
}
