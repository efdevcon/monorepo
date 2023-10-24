import * as dotenv from 'dotenv'

dotenv.config()

export const SERVER_CONFIG = {
  NODE_ENV: process.env.NODE_ENV,

  SESSION_SECRET: process.env.SESSION_SECRET,
  INFURA_ID: process.env.INFURA_ID || '',
  DB_CONNECTION_STRING: process.env.DB_CONNECTION_STRING || '',
  ELASTIC_ENDPOINT: process.env.ELASTIC_ENDPOINT || '',
}
