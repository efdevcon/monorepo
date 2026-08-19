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
import { defaultNoStore } from '@/middleware/cache'
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
// Every response gets Cache-Control (no-store unless a route opts into
// publicCache / sets its own) so Render's "All files" edge caching can never
// cache a route that didn't explicitly ask for it. See middleware/cache.ts.
app.use(defaultNoStore)

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

// Netlify deploy previews get per-PR subdomains
// (deploy-preview-<n>--<site>.netlify.app). Allow them for our own sites so
// PR previews can talk to the API without editing this file per PR. Anchored
// to the exact deploy-preview format (not a bare suffix match) because this
// API serves with credentials — a bare suffix could be shadowed by a
// third-party Netlify site name ending in `--devcon-event-app`.
const PREVIEW_ORIGIN_RE = /^https:\/\/deploy-preview-\d+--(devcon-event-app|devcon-app|devcon-archive)\.netlify\.app$/

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Allow requests with no origin (like mobile apps, curl, etc)
        return callback(null, true)
      }

      const allowed =
        ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_RE.test(origin) || SERVER_CONFIG.NODE_ENV !== 'production'
      if (allowed) {
        callback(null, true)
      } else {
        console.warn('BLOCKED by CORS:', origin)
        // Deny WITHOUT throwing: an Error here bubbles into the express error
        // handler and turns a CORS denial into a 500 on the endpoint itself.
        // Passing `false` sends the response without CORS headers — the
        // browser blocks it client-side, and non-browser clients are
        // unaffected. (A blocked preview origin surfaced as a mystery 500 on
        // /sessions on 2026-08-17.)
        callback(null, false)
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
