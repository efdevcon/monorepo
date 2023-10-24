import express, { json, Request, Response, urlencoded } from 'express'
import serverless from 'serverless-http'

// Basic Express configuration
const server = express()
const router = express.Router()
server.use(json())
server.use(urlencoded())

// Connect db
// mongoose.connect(SERVER_CONFIG.DB_CONNECTION_STRING, {
//   useNewUrlParser: true,
//   useFindAndModify: true,
//   useUnifiedTopology: true,
//   useCreateIndex: true,
// })
// mongoose.connection.on('error', err => {
//   console.error('err', err)
// })
// mongoose.connection.on('connected', (err, res) => {
//   console.log('mongoose is connected')
// })

// Routes
router.get('/', (req: Request, res: Response) => {
  res.status(200).send('Service up and running!')
})

// userAccountRoutes.register(router)
// twitterRoutes.register(router)

// Express-sessions
// if (!SERVER_CONFIG.SESSION_SECRET) throw new Error('Required SESSION_SECRET not found.')
// if (SERVER_CONFIG.NODE_ENV === 'production') {
//   console.log('Configuring secure session cookies. Requires an https-enabled website.')
//   server.use(session({ secret: SERVER_CONFIG.SESSION_SECRET, cookie: { secure: true } }))
// } else {
//   server.use(session({ secret: SERVER_CONFIG.SESSION_SECRET }))
// }

// // Passport configuration
// passport.use('web3', web3Strategy)
// server.use(passport.initialize())
// server.use(passport.session())

// passport.serializeUser(serializeUser)
// passport.deserializeUser(deserializeUser)

server.use('/api', router)

export const handler = serverless(server)
