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
    name: 'Parallel_test_4',
  },
  {
    device: 'Google Pixel 5',
    browserName: 'Android',
    os_version: '11.0',
    real_mobile: 'true',
    build,
    name: 'Parallel_test_4',
  },
  // {
  //   browserName: 'chrome',
  //   browser_version: 'latest',
  //   os: 'Windows',
  //   os_version: '10',
  //   build,
  //   name: 'Parallel_test_1',
  // },
  {
    browserName: 'firefox',
    browser_version: 'latest-beta',
    os: 'Windows',
    os_version: '10',
    build,
    name: 'Parallel_test_2',
  },
  {
    device: 'iPhone 12 Pro',
    browserName: 'iPhone',
    os_version: '14',
    proxy: true,
    real_mobile: 'true',
    build,
    name: 'Parallel_test_3',
  },
  {
    browserName: 'Safari',
    browser_version: 'latest',
    os: 'OS X',
    os_version: 'Big Sur',
    build,
    name: 'Parallel_test_5',
  },
]

const runTest = async capabilities => {
  const driver = await new webdriver.Builder()
    .usingServer('http://lassejacobsen2:mBqtLq8ffDpp1UFA5679@hub-cloud.browserstack.com/wd/hub')
    .withCapabilities({
      ...capabilities,
      'browserstack.local': true,
      'browserstack.localIdentifier': 'random',
    })
    .build()

  try {
    const host = `http://bs-local.com:8000`

    await driver.get(host)
    await driver.sleep(5000)
    await driver.findElement(webdriver.By.id('hamburger-toggle')).click()

    // await driver.wait(webdriver.until.titleMatches(/The Ethereum developer conference/i), 5000)
    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"passed","reason": "Test went great!"}}'
    )
  } catch (e) {
    console.error(e, 'test error')
    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Test errored out"}}'
    )
  } finally {
    await driver.quit()
  }

  // try {
  //   const host = `http://bs-local.com:8000`

  //   await driver.get(host)
  //   await driver.wait(webdriver.until.titleMatches(/The Ethereum developer conference/i), 5000)
  //   console.log('Test passed')
  //   await driver.executeScript(
  //     'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"passed","reason": "Title contains BrowserStack!"}}'
  //   )
  // } catch (e) {
  //   console.error(e, 'test error')
  //   await driver.executeScript(
  //     'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Test errored out"}}'
  //   )
  // } finally {
  //   await driver.quit()
  // }
}

async function runTests() {
  const browserstackLocal = new browserstack.Local()

  await browserstackLocal.start(
    {
      key: 'mBqtLq8ffDpp1UFA5679',
      localIdentifier: 'random',
    },
    async () => {
      console.log('BS local started')

      try {
        await Promise.allSettled(capabilities.map(runTest))
      } catch (e) {
        console.error(e, 'wtf')
      }

      await browserstackLocal.stop(() => console.log('BS local stopped'))
    }
  )
}

runTests()
