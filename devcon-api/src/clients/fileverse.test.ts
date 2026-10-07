import { toLinks } from './fileverse'

test('cell links: single objects and the per-cell lists an xlsx import produces, web addresses only', () => {
  const links = toLinks({
    '1_1': [{ linkType: 'webpage', linkAddress: 'https://docs.example.org/readme#k=abc' }],
    '5_7': { linkType: 'webpage', linkAddress: ' https://example.org/slides ' },
    '6_7': [{ linkType: 'sheet', linkAddress: 'Schedule!A1' }],
    '7_7': [{ linkType: 'webpage', linkAddress: 'mailto:hub@example.org' }],
    '8_7': null,
  })
  expect([...links.entries()]).toEqual([
    ['1_1', 'https://docs.example.org/readme#k=abc'],
    ['5_7', 'https://example.org/slides'],
  ])
  expect(toLinks(undefined).size).toBe(0)
})
