import { client } from '../../../../tina/__generated__/client'
import path from 'path';
const fs = require('fs')

function cleanUpText(text: string): string {
    // Fix spacing around periods and braces that are incorrectly joined to words
    // text = text.replace(/([a-zA-Z])(\{link\|)/g, '$1 $2'); // Ensures space before "{link|"
    // text = text.replace(/(\})([a-zA-Z])/g, '$1 $2'); // Ensures space after "}"
    text = text.replace(/(\.)([A-Z])/g, '$1 $2'); // Ensures space after periods before capital letters
// 
    // Additional common cleanups can be added here
    return text;
}

const processContent = async (fileName: any) => {
    try {
        const cmsContent = await client.queries.pages({ relativePath: fileName })
        const jsonData = cmsContent.data.pages as any;

        // Write the raw data to files, easier to inspect/debug this way - adds no functionality/can be commented out as needed
        fs.writeFileSync(path.resolve(__dirname, 'tina-queries', fileName.split('.mdx')[0].concat('.json')), JSON.stringify(jsonData));

        // Function to recursively extract text
        function extractText(node: any): string {
            if (!node || typeof node !== 'object') return '';
            let text = '';
        
            if (node.type) {
                switch (node.type) {
                    case 'text':
                        // Ignore the bold property and append the text directly.
                        text += node.text;
                        break;
                    case 'a':
                        const linkText = node.children ? node.children.map((child: any) => extractText(child)).join('') : '';
                        text += `{link|${linkText}|${node.url}}`;
                        break;
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6':
                        if (node.children) {
                            text += `${node.children.map((child: any) => extractText(child)).join('')}: `;
                        }
                        break;
                    case 'p':
                    case 'div':
                        if (node.children && Array.isArray(node.children)) {
                            text += node.children.map((child: any) => extractText(child)).join(' ');
                        }
                        break;
                    default:
                        if (node.children && Array.isArray(node.children)) {
                            text += extractText(node.children);
                        }
                }
            } else {
                // Handle objects possibly representing buttons or other link elements
                if (node.link && node.text && typeof node.link === 'string' && typeof node.text === 'string') {
                    text += `{button|${node.text}|${node.link}}`;
                } else {
                    // Recursively process other properties
                    Object.keys(node).forEach(key => {
                        if (!['id', '__typename', '_sys', 'url', 'title', 'type', 'bold', 'link', 'text'].includes(key)) {
                            text += extractText(node[key]);
                        }
                    });
                }
            }
            return text;
        }

        // Ignored keys at the root level
        const ignoredRootKeys = ['id', '__typename', '_sys'];

        // Collecting content with headers for each section
        let content = `Category: ${jsonData._sys.filename}\n\n`;
        Object.keys(jsonData).forEach(key => {
            if (!ignoredRootKeys.includes(key)) {
                content += `${key.toUpperCase()}\n`;
                content += extractText(jsonData[key]) + '\n\n';
            }
        });

        // Ensure the content directory exists
        const contentDir = path.resolve(__dirname, 'content');
        if (!fs.existsSync(contentDir)) {
            fs.mkdirSync(contentDir);
        }

        // Writing the content to a file
        const filename = path.join(contentDir, jsonData._sys.filename.replace(/\.[^/.]+$/, "") + '.txt');

        content = cleanUpText(content);

        fs.writeFileSync(filename, content.trim(), 'utf-8');
        console.log(`Content written to ${filename}`);

        // return filename; // Return the path where the file was written
    } catch (error) {
        console.error('Error reading, parsing, or writing the file:', fileName, error);
        return null;
    }
}

// Load all files from folder
function loadAllFilesFromFolder(folderPath: any) {
    try {
        const directoryPath = path.resolve(__dirname, folderPath);
        const files = fs.readdirSync(directoryPath).filter(Boolean);
        return files;
    } catch (error) {
        console.error('Error accessing folder or reading files:', error);
        return [];
    }
}

const contentFiles = loadAllFilesFromFolder('../../../../cms/pages')

contentFiles.forEach((fileName: any) => {
    processContent(fileName);
})