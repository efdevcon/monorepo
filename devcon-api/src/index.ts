import { SERVER_CONFIG } from 'utils/config'
import app from 'app'

app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`[SERVER]: Running in ${SERVER_CONFIG.NODE_ENV} mode`)
  console.log(`[SERVER]: Listening at http://localhost:${SERVER_CONFIG.PORT}/`)
})
