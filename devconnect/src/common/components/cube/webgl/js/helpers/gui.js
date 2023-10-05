/**
 * @author Lorenzo Cadamuro / http://lorenzocadamuro.com
 */

import * as dat from 'dat.gui'
import queryString from 'query-string'

let gui

const init = () => {
  if (!gui) {
    gui = new dat.GUI({ width: 300 })
  }
}

setTimeout(() => {
  const parsed = queryString.parse(location.search)
  const debugMode = parsed.debug === 'true'

  if (debugMode || (devMode && false) /* Not interested in GUI for now, remove the false if you want it */) {
    init()
  }
})

export default {
  get: callback => {
    setTimeout(() => {
      if (gui) {
        callback(gui)
      }
    })
  },
}
