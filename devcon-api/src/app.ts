import express, { json, urlencoded } from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import session from 'express-session'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from 'swagger/definition.json'
import { errorHandler } from 'middleware/error'
import { notFoundHandler } from 'middleware/notfound'
import { logHandler } from 'middleware/log'
import { router } from './routes'
import { SERVER_CONFIG, SESSION_CONFIG } from 'utils/config'

const app = express()

// configure express app
app.use(helmet())
app.use(cors())
app.use(json())
app.use(urlencoded({ extended: true }))
app.use(logHandler)

const sessionConfig = {
  name: SESSION_CONFIG.cookieName,
  secret: SESSION_CONFIG.password,
  cookie: {},
  resave: false,
  saveUninitialized: true,
}
if (SERVER_CONFIG.NODE_ENV === 'production') {
  app.set('trust proxy', 1) // for secure cookies and when using HTTPS: https://expressjs.com/en/guide/behind-proxies.html
  sessionConfig.cookie = { secure: true }
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
