import { client } from '../../../../devcon/tina/__generated__/client'
import path from 'path'
import fs from 'fs'
import yaml from 'yaml'

interface Chunk {
  key: string
  content: any
}

const splitMarkdownByKeys = (markdownContent: string): Chunk[] => {
  // Parse the markdown content as multiple YAML documents
  const documents = yaml.parseAllDocuments(markdownContent)

  const chunks: Chunk[] = []
  documents.forEach((doc) => {
    const contentDict = doc.toJSON()
    for (const key in contentDict) {
      if (key === '_template') return

      if (contentDict.hasOwnProperty(key)) {
        const chunk: Chunk = {
          key: key,
          content: contentDict[key],
        }
        chunks.push(chunk)
      }
    }
  })

  return chunks
}
function cleanUpText(text: string): string {
  // Fix spacing around periods and braces that are incorrectly joined to words
  // text = text.replace(/([a-zA-Z])(\{link\|)/g, '$1 $2'); // Ensures space before "{link|"
  // text = text.replace(/(\})([a-zA-Z])/g, '$1 $2'); // Ensures space after "}"
  text = text.replace(/(\.)([A-Z])/g, '$1 $2') // Ensures space after periods before capital letters
  //
  // Additional common cleanups can be added here
  return text
}

const devconDir = path.resolve(__dirname, '../../../../devcon')
const contentDir = path.resolve(__dirname, 'formatted-content')

// const writeFile = async (fileName: any) => {
//   const sourcePath = path.join(devconDir, 'cms/pages', fileName)
//   const destinationPath = path.join(contentDir, fileName.split('.mdx')[0] + '.txt')

//   try {
//     const fileContent = fs.readFileSync(sourcePath, 'utf-8')
//     fs.writeFileSync(destinationPath, fileContent, 'utf-8')
//     console.log(`Content written to ${destinationPath}`)
//   } catch (error) {
//     console.error('Error reading or writing the file:', fileName, error)
//   }
// }

const writeFile = async (fileName: string) => {
  const sourcePath = path.join(devconDir, 'cms/pages', fileName)
  const baseFileName = fileName.split('.mdx')[0]

  try {
    const fileContent = fs.readFileSync(sourcePath, 'utf-8')
    const chunks = splitMarkdownByKeys(fileContent)

    // Write each chunk to a separate file
    chunks.forEach((chunk) => {
      const destinationPath = path.join(contentDir, `${baseFileName}.${chunk.key}.txt`)
      fs.writeFileSync(destinationPath, yaml.stringify(chunk.content), 'utf-8')
      console.log(`Content written to ${destinationPath}`)
    })
  } catch (error) {
    console.error('Error reading or writing the file:', fileName, error)
  }
}

const processContent = async (fileName: any) => {
  try {
    const cmsContent = await client.queries.pages({ relativePath: fileName })
    const jsonData = cmsContent.data.pages as any

    // Write the raw data to files, easier to inspect/debug this way - adds no functionality/can be commented out as needed
    // fs.writeFileSync(path.resolve(__dirname, 'tina-queries', fileName.split('.mdx')[0].concat('.json')), JSON.stringify(jsonData))

    // Function to recursively extract text
    function extractText(node: any): string {
      if (!node || typeof node !== 'object') return ''
      let text = ''

      if (node.type) {
        switch (node.type) {
          case 'text':
            // Ignore the bold property and append the text directly.
            text += node.text
            break
          case 'a':
            const linkText = node.children ? node.children.map((child: any) => extractText(child)).join('') : ''
            text += `{link|${linkText}|${node.url}}`
            break
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            if (node.children) {
              text += `${node.children.map((child: any) => extractText(child)).join('')}: `
            }
            break
          case 'p':
          case 'div':
            if (node.children && Array.isArray(node.children)) {
              text += node.children.map((child: any) => extractText(child)).join(' ')
            }
            break
          default:
            if (node.children && Array.isArray(node.children)) {
              text += extractText(node.children)
            }
        }
      } else {
        // Handle objects possibly representing buttons or other link elements
        if (node.link && node.text && typeof node.link === 'string' && typeof node.text === 'string') {
          text += `{button|${node.text}|${node.link}}`
        } else {
          // Recursively process other properties
          Object.keys(node).forEach((key) => {
            if (!['id', '__typename', '_sys', 'url', 'title', 'type', 'bold', 'link', 'text'].includes(key)) {
              text += extractText(node[key])
            }
          })
        }
      }
      return text
    }

    // Ignored keys at the root level
    const ignoredRootKeys = ['id', '__typename', '_sys']

    // Collecting content with headers for each section
    let content = `Category: ${jsonData._sys.filename}\n\n`
    Object.keys(jsonData).forEach((key) => {
      if (!ignoredRootKeys.includes(key)) {
        content += `${key.toUpperCase()}\n`
        content += extractText(jsonData[key]) + '\n\n'
      }
    })

    // Writing the content to a file
    const filename = path.join(contentDir, jsonData._sys.filename.replace(/\.[^/.]+$/, '') + '.txt')

    content = cleanUpText(content)

    fs.writeFileSync(filename, content.trim(), 'utf-8')
    console.log(`Content written to ${filename}`)

    // return filename; // Return the path where the file was written
  } catch (error) {
    console.error('Error reading, parsing, or writing the file:', fileName, error)
    return null
  }
}

// Load all files from folder
function loadAllFilesFromFolder() {
  try {
    const directoryPath = path.resolve(devconDir, 'cms/pages')
    const files = fs.readdirSync(directoryPath).filter(Boolean)
    return files
  } catch (error) {
    console.error('Error accessing folder or reading files:', error)
    return []
  }
}

if (!fs.existsSync(contentDir)) {
  fs.mkdirSync(contentDir)
}

const contentFiles = loadAllFilesFromFolder()

// contentFiles.forEach((fileName: any) => {
//   processContent(fileName)
// })

contentFiles.forEach((fileName: any) => {
  writeFile(fileName)
})
