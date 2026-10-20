import { SERVER_CONFIG } from '@/utils/config'
import app from '@/app'
import { initStore } from '@/data/store'
import { startLiveExportTimer } from '@/services/community-hubs'

initStore()

app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`[SERVER]: Running in ${SERVER_CONFIG.NODE_ENV} mode`)
  console.log(`[SERVER]: Listening at http://localhost:${SERVER_CONFIG.PORT}/`)
})

// Community Hubs: start the hourly live export (GitHub's own schedule runs hours late).
startLiveExportTimer()

// start cron job
