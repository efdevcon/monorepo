const webdriver = require('selenium-webdriver')

const runner = async driver => {
  await driver.get('http://bs-local.com:8000/archive')
  await driver.wait(webdriver.until.titleMatches(/The Ethereum developer conference/i), 5000)
  await driver.findElement(webdriver.By.id('hamburger-toggle')).click()
}

runner.testName = '/archive'

module.exports = runner
