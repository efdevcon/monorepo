const path = require('path')

const pages = [
  {
    route: '/',
    precacheHtml: true,
    // precacheJson: true,
  },
  {
    route: '/login',
    precacheHtml: true,
    // precacheJson: true,
  },
  {
    route: '/schedule',
    precacheHtml: true,
    // precacheJson: true,
  },
  // {
  //   route: '/side-events',
  //   precacheHtml: true,
  //   precacheJson: true,
  // },
  {
    route: '/speakers',
    precacheHtml: true,
    // precacheJson: true,
  },
  // {
  //   route: '/404',
  //   precacheHtml: true,
  //   // precacheJson: true,
  // },
  // {
  //   route: '/info',
  //   precacheHtml: true,
  //   precacheJson: true,
  // },
  {
    route: '/venue',
    precacheHtml: true,
    // precacheJson: true,
  },
  // {
  //   route: '/schedule',
  //   precacheHtml: false,
  //   precacheJson: true,
  //   dynamicPages: sessionData.map(session => session.id),
  // },
  // {
  //   route: '/venue',
  //   precacheHtml: false,
  //   precacheJson: true,
  //   dynamicPages: roomData.map(room => room.id),
  // },
  // {
  //   route: '/speakers',
  //   precacheHtml: false,
  //   precacheJson: true,
  //   dynamicPages: speakerData.map(speaker => speaker.id),
  // },
]

function getPageJSONPath(buildId, pageRoute) {
  return path.posix.join('/_next/data/', buildId, `${pageRoute}.json`)
}

function getJSONEntry(buildId, pageRoute) {
  return {
    url: getPageJSONPath(buildId, pageRoute),
    revision: null,
  }
}

function getHTMLEntry(buildId, pageRoute) {
  return {
    url: pageRoute,
    revision: buildId,
  }
}

function getNormalPageEntries(buildId, page) {
  let entries = []
  if (page.precacheHtml) {
    entries.push(getHTMLEntry(buildId, page.route))
  }
  if (page.precacheJson) {
    entries.push(getJSONEntry(buildId, page.route))
  }
  return entries
}

function getDynamicPageEntries(buildId, page) {
  let pageList = page.dynamicPages.map(actualPage => path.posix.join(page.route, actualPage))
  let entries = pageList.map(route =>
    getNormalPageEntries(buildId, { route: route, precacheHtml: page.precacheHtml, precacheJson: page.precacheJson })
  )
  return entries.reduce((acc, curr) => acc.concat(curr), [])
}

function getPageEntries(buildId, page) {
  if (Array.isArray(page.dynamicPages)) {
    return getDynamicPageEntries(buildId, page)
  } else {
    return getNormalPageEntries(buildId, page)
  }
}

function getGeneratedPrecacheEntries(buildId) {
  const precacheEntries = pages.map(page => getPageEntries(buildId, page)).reduce((acc, curr) => acc.concat(curr), [])

  return precacheEntries
}

module.exports = getGeneratedPrecacheEntries
