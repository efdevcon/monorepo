import { UserProfile } from '../../../src/types/UserProfile';

const GSheetReader: any = require('g-sheets-api');
const slugify = require('slugify')
const fs = require('fs');
require('dotenv').config()

const writeToDisk = false
const outputDir = '../src/content/profiles/'
const sheet = process.env.PROFILE_SHEET_ID

export async function GetUserProfiles(): Promise<Array<UserProfile>> {
  let profiles: Array<UserProfile> = []

  const pr = await GSheetReader(
    {
      sheetId: sheet,
      sheetNumber: 0,
      returnAllResults: true,
    },
    (results: any) => {
      console.log('Profile records found', results.length)

      results.forEach((result: any) => {
        const status = result['Submission Status']
        const presenting = result['Presenting']
        // profiles are filtered from the devcon import sheet - no need for filters here
        // if (presenting === 'No' || status !== 'Submitted') return

        let profile: any = {
          name: `${result['First Name']} ${result['Last Name']}`,
          role: result['Role'],
          description: result['Biography'],
        }
        if (result['Organization'] && result['Organization'].trim() !== '') {
          profile.organization = result['Organization']
        }
        if (result['Country'] && result['Country'].trim() !== '') {
          profile.country = result['Country']
        }

        profiles.push(profile)
      })

      // profiles = profiles.splice(0, 20)

      profiles = Array.from(new Set(profiles.map(obj => obj.name))).map(name => {
        return profiles.find(obj => obj.name === name)
      }).filter(i => i !== undefined) as UserProfile[]

      if (writeToDisk) {
        console.log('Unique profiles to write to disk..', profiles.length)
        profiles.forEach(i => {
          writeProfileToFile(i)
        })
      }
    },
    (error: any) => {
      console.log('Unable to fetch sheet results..')
      console.error(error)
    }
  )

  return profiles
}

export function writeProfileToFile(profile: any) {
  if (!profile.name) {
    console.log('Not found', profile)
    return
  }

  const sluggified = slugify(profile.name.toLowerCase(), { strict: true })
  const englishDir = outputDir + '/en'
  if (!fs.existsSync(englishDir)) {
    console.log('Create dir', englishDir)
    fs.mkdirSync(englishDir);
  }
  const spanishDir = outputDir + '/es'
  if (!fs.existsSync(spanishDir)) {
    console.log('Create dir', spanishDir)
    fs.mkdirSync(spanishDir);
  }

  const attributes = Object.entries(profile)
  const markdown = `---${attributes.reduce((acc, [key, value], index) => {
    if (typeof value === 'undefined' && key === 'keywords') return acc += `\n${key}: []`
    if (typeof value === 'undefined' && key === 'tags') return acc += `\n${key}: []`
    if (typeof value === 'undefined') return acc += `\n${key}: ''`
    if (typeof value === 'number') return acc += `\n${key}: ${value}`
    if (typeof value === 'string') {
      let stringValue = value.trim().replace(/[\""]/g, '\\"');
      return acc += `\n${key}: "${stringValue}"`
    }
    if (typeof value === 'object' && Array.isArray(value)) {
      return acc += `\n${key}: [${value.map(item => `'${item}'`)}]`
    }

    return acc += `\n${key}: '${value}'`;
  }, '')}\n---\n`;

  // console.log('MARKDOWN', markdown)
  fs.writeFileSync(`${englishDir}/${sluggified}.md`, markdown);
  fs.writeFileSync(`${spanishDir}/${sluggified}.md`, markdown);
}
