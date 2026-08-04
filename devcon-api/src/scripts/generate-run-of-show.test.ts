import { formatTime, EVENT_TIMEZONES } from './generate-run-of-show'

test('formats slot times in the event timezone', () => {
  // 2026-11-10T04:30:00Z is 10:00 IST (UTC+5:30)
  expect(formatTime('2026-11-10T04:30:00Z', 'Asia/Kolkata')).toBe('10:00')
  // and 11:30 in Bangkok (UTC+7)
  expect(formatTime('2026-11-10T04:30:00Z', 'Asia/Bangkok')).toBe('11:30')
})

test('devcon8 is mapped to IST', () => {
  expect(EVENT_TIMEZONES['devcon8']).toBe('Asia/Kolkata')
})
