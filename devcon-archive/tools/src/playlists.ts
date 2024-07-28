import { ArchiveVideo } from '../../src/types/ArchiveVideo';
import { getVideoId } from '../../src/utils/video'
import fetch from 'node-fetch';
import moment from 'moment'
import { join } from 'path'
import matter from 'gray-matter'
import fs from 'fs'

require('dotenv').config()

async function convertMarkdownPlaylistsToJSON() { 
  const dir = join(process.cwd(), '../src/content/archive/playlists')
  const files = fs.readdirSync(dir, { withFileTypes: true }).filter(i => i.isFile() && i.name.endsWith('.md'))

  return files.map(i => {
    const fullPath = join(dir, i.name)
    const content = fs.readFileSync(fullPath, 'utf8')
    const doc = matter(content)

    const path = join(process.cwd(), 'export', 'playlists', i.name.replace('.md', '.json'))
    fs.writeFileSync(path, JSON.stringify(
      {
      ...doc.data,
      image: doc.data.image.replace('../../../../static/assets/uploads', 'images'),
      
  }   , null, 2))
  })
}

convertMarkdownPlaylistsToJSON()