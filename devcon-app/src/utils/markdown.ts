// import matter from 'gray-matter'
// import path from 'path';
// import fs from 'fs';
// import { BASE_CONTENT_FOLDER } from 'utils/constants'
const createMD = require('markdown-it');
const md = createMD({ html: true }).use(require('markdown-it-video'));

const markdownUtils = (() => {
  const _interface = {
    // readFolder: async (folder: string, lang: string, file: string) => {

    // },
    // readMarkdownFile: async (filePath: string) => {
    //   filePath = path.resolve(process.cwd(), BASE_CONTENT_FOLDER, filePath);

    //   try {
    //     const content = await fs.promises.readFile(filePath, 'utf8')

    //     if (!content) {
    //         console.log('File has no content..', filePath)
    //         return undefined
    //     }

    //     const data = matter(content)

    //     return data;
    //   } catch(e) {
    //     console.log(e, 'File unreadable');

    //     return null;
    //   }
    // },
    toHtml: async (markdown: string, slice?: number) => {
      let raw = markdown;

      if (slice && raw.length > 255) raw = `${raw.slice(0, slice)}...`

      // return 'placeholder';

      return md.render(markdown)
    }
  }

  return _interface;
})();

export function toHtml(markdown: string, slice?: number) {
  let raw = markdown
  if (!raw) return ''

  if (slice && raw.length > 255) raw = `${raw.slice(0, slice)}...`

  return md.render(markdown)
}

export default markdownUtils;