import { getPretalxConfig, getEventIdByPretalxSlug, PRETALX_INSTANCES } from './config'

describe('pretalx config: dual mum.speakat.xyz events', () => {
  test('registers test-devcon-8 and devcon8 instances', () => {
    expect(PRETALX_INSTANCES['test-devcon-8']).toBeDefined()
    expect(PRETALX_INSTANCES['devcon8']).toBeDefined()
  })

  test('eventId equals slug and points at mum.speakat.xyz', () => {
    const test8 = getPretalxConfig('test-devcon-8')
    expect(test8.eventId).toBe('test-devcon-8')
    expect(test8.PRETALX_EVENT_NAME).toBe('test-devcon-8')
    expect(test8.PRETALX_BASE_URI).toBe('https://mum.speakat.xyz/api')

    const devcon8 = getPretalxConfig('devcon8')
    expect(devcon8.eventId).toBe('devcon8')
    expect(devcon8.PRETALX_EVENT_NAME).toBe('devcon8')
    expect(devcon8.PRETALX_BASE_URI).toBe('https://mum.speakat.xyz/api')
  })

  test('reverse lookup maps both slugs to their eventId', () => {
    expect(getEventIdByPretalxSlug('test-devcon-8')).toBe('test-devcon-8')
    expect(getEventIdByPretalxSlug('devcon8')).toBe('devcon8')
  })

  test('the devcon-mumbai-playground placeholder is gone', () => {
    expect(PRETALX_INSTANCES['devcon-mumbai-playground']).toBeUndefined()
  })

  test('devcon-7 instance is untouched', () => {
    expect(getPretalxConfig('devcon-7').PRETALX_EVENT_NAME).toBe('devcon7-sea')
  })
})
