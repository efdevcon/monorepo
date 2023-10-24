const runTests = require('./api.js')
const archive = require('./tests/archive/index')
const archiveWatch = require('./tests/archive/watch')

runTests([archive, archiveWatch])
