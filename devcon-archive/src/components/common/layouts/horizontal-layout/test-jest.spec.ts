import { Browser, BrowserContext, chromium, devices, Page } from 'playwright'

// console.log(Object.keys(devices, 'devices'))

let browser: Browser
let context: BrowserContext
let page: Page

beforeAll(async () => {
  browser = await chromium.launch()

  context = await browser.newContext({
    ...devices['iPhone 7'],
  })
})

afterAll(async () => {
  await browser.close()
})

beforeEach(async () => {
  page = await context.newPage()
})

afterEach(async () => {
  await page.close()
})

it('should work', async () => {
  // await page.goto('http://localhost:8000/en')
  // await page.waitForSelector('[data-jest="hero"]')
  // await page.screenshot({ path: `screenshots/localhost.png` })
  // expect(await page.title()).toBe('Road to Devcon: The Ethereum developer conference')
  expect(true).toBe(true)
})
