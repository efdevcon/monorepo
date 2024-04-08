import express, { json, urlencoded } from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from 'swagger/definition.json'
import { errorHandler } from 'middleware/error'
import { notFoundHandler } from 'middleware/notfound'
import { logHandler } from 'middleware/log'
import { router } from './routes'

const app = express()

// configure express app
app.use(helmet())
app.use(cors())
app.use(json())
app.use(urlencoded({ extended: true }))
app.use(logHandler)

// static endpoints
app.use('/static', express.static(path.join(__dirname, '..', 'public')))
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// add routes before error handlers
app.use(router)

// add handlers after routes
app.use(errorHandler)
app.use(notFoundHandler)

export default app
