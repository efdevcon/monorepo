/*
  Browserstack has proven too unreliable to include in the CI pipeline, but running the script manually can still be valuable
*/
const browserstack = require('browserstack-local')
const webdriver = require('selenium-webdriver')
const build = Date.now().toString()

const capabilities = [
  {
    device: 'Samsung Galaxy S20',
    browserName: 'Android',
    os_version: '11.0',
    real_mobile: 'true',
    build,
    name: 'Samsung Galaxy S20/Android',
  },
  {
    device: 'Google Pixel 5',
    browserName: 'Android',
    os_version: '11.0',
    real_mobile: 'true',
    build,
    name: 'Google Pixel/Android',
  },
  {
    browserName: 'firefox',
    browser_version: 'latest-beta',
    os: 'Windows',
    os_version: '10',
    build,
    name: 'Windows/Firefox:latest',
  },
  {
    device: 'iPhone 12 Pro',
    browserName: 'iPhone',
    os_version: '14',
    proxy: true,
    real_mobile: 'true',
    build,
    name: 'IPhone 12/Safari',
  },
  {
    browserName: 'Safari',
    browser_version: 'latest',
    os: 'OS X',
    os_version: 'Big Sur',
    build,
    name: 'Big Sur/Safari',
  },
]

const runTest = async (runner, capabilities) => {
  const driver = await new webdriver.Builder()
    .usingServer('http://lassejacobsen2:mBqtLq8ffDpp1UFA5679@hub-cloud.browserstack.com/wd/hub')
    .withCapabilities({
      ...capabilities,
      name: runner.testName,
      'browserstack.local': true,
      'browserstack.localIdentifier': 'random',
    })
    .build()

  try {
    await runner(driver)

    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"passed","reason": "Test passed"}}'
    )
  } catch (e) {
    console.error(e, 'test error')
    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Test failed"}}'
    )
  } finally {
    await driver.quit()
  }
}

async function runTests(tests) {
  const browserstackLocal = new browserstack.Local()

  await browserstackLocal.start(
    {
      key: 'mBqtLq8ffDpp1UFA5679',
      localIdentifier: 'random',
    },
    async () => {
      console.log('BS local started')

      try {
        await Promise.allSettled(
          tests.map(async runner => {
            await Promise.allSettled(
              capabilities.map(async capability => {
                await runTest(runner, capability)
              })
            )
          })
        )
      } catch (e) {
        console.error(e, 'Test aborted due to errors')
      }

      await browserstackLocal.stop(() => console.log('BS local stopped'))
    }
  )
}

module.exports = runTests
