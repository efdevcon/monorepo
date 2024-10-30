import express, { json, urlencoded, Response } from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import session, { SessionOptions } from 'express-session'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from '@/swagger/definition.json'
import { errorHandler } from '@/middleware/error'
import { notFoundHandler } from '@/middleware/notfound'
import { logHandler } from '@/middleware/log'
import { router } from './routes'
import { SERVER_CONFIG, SESSION_CONFIG } from '@/utils/config'
import pgSession from 'connect-pg-simple'
import { getDbPool } from './utils/db'

const app = express()

// configure express app
app.use(helmet())
app.use(json())
app.use(urlencoded({ extended: true }))
app.use(logHandler)

const ALLOWED_ORIGINS = [
  'https://api.devcon.org',
  'https://devcon.org',
  'https://dev--devcon-app.netlify.app',
  'http://localhost:3000', // Local development
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) {
        console.log('No origin')
        return callback(null, true)
      }

      if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || SERVER_CONFIG.NODE_ENV !== 'production') {
        callback(null, true)
      } else {
        console.warn('Blocked by CORS:', origin)
        callback(null, true) // Still allow it for now
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
)

const pgSessionStore = pgSession(session)
const sessionConfig: SessionOptions = {
  name: SESSION_CONFIG.cookieName,
  secret: SESSION_CONFIG.password,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'none',
    secure: SERVER_CONFIG.NODE_ENV === 'production',
    path: '/',
    domain:
      SERVER_CONFIG.NODE_ENV === 'production'
        ? 'devcon.org' // Main domain
        : undefined,
  },
  resave: false,
  saveUninitialized: false,
  store: new pgSessionStore({
    pool: getDbPool(),
    tableName: 'Session',
  }),
  proxy: true,
}

if (SERVER_CONFIG.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}
app.use(session(sessionConfig))

// static endpoints
app.use('/static', express.static(path.join(__dirname, '..', 'public')))
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// add routes before error handlers
app.use(router)

// add handlers after routes
app.use(errorHandler)
app.use(notFoundHandler)

export default app
