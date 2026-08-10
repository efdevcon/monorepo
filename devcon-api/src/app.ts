import express, { json, urlencoded, Response, NextFunction, Request, Router } from 'express'
import path from 'path'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from '@/swagger/definition.json'
import { errorHandler } from '@/middleware/error'
import { notFoundHandler } from '@/middleware/notfound'
import { logHandler } from '@/middleware/log'
import { router } from './routes'
import { SERVER_CONFIG } from '@/utils/config'
import { existsSync } from 'fs'

const app = express()

// configure express app
app.use(helmet())
app.use(compression())
app.use(json())
app.use(urlencoded({ extended: true }))
app.use(logHandler)

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8000',
  'https://devcon.org',
  'https://test.devcon.org',
  'https://dev--devcon-app.netlify.app',
  'https://api.devcon.org',
  'https://app.devcon.org',
  'https://archive.devcon.org',
  'https://devcon-archive.netlify.app',
  'https://meerkat.events',
  'https://connections.cursive.team',
  'https://devcon-event-app.netlify.app',
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Allow requests with no origin (like mobile apps, curl, etc)
        return callback(null, true)
      }

      if (ALLOWED_ORIGINS.includes(origin) || SERVER_CONFIG.NODE_ENV !== 'production') {
        callback(null, true)
      } else {
        console.warn('BLOCKED by CORS:', origin)
        // callback(null, true) // allow for now. Need to define proper list of origins
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
)

// static endpoints (files only change on deploy/data sync, so let the CDN hold them)
app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }))
app.use('/data', express.static(path.join(__dirname, '..', 'data'), { maxAge: '1h' }))
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// add routes before error handlers
app.use(router)

// add handlers after routes
app.use(errorHandler)
app.use(notFoundHandler)

export default app
