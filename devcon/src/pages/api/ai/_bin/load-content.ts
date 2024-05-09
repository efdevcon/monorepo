import fs from 'fs';
import path from 'path';
import matter from 'gray-matter'; // For parsing front matter in MDX files

// Function to read and parse MDX files from a folder
function loadAndParseMDXFiles(relativeFolderPath: string): void {
  const folderPath = path.resolve(__dirname, relativeFolderPath);

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      return;
    }

    const sectionsByFile: Record<string, string[]> = {};

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          return;
        }

        const { content, data: frontMatter } = matter(data);
        
        // Extract the sections or content from the frontmatter data
        // These sections can be used for creating OpenAI embeddings
        const sections = extractSections(frontMatter);

        // Store the sections in the sectionsByFile object with the filename as the key
        sectionsByFile[file] = sections;

        // Write the sectionsByFile object to a JSON file in the current folder
        const outputPath = path.join(__dirname, 'sections.json');
        fs.writeFile(outputPath, JSON.stringify(sectionsByFile, null, 2), (err) => {
          if (err) {
            console.error('Error writing file:', err);
            return;
          }
          console.log('Sections written to sections.json');
        });
      });
    });
  });
}

// Function to extract sections from frontmatter data
function extractSections(frontMatter: any): string[] {
  const sections: string[] = [];

  // Recursive function to extract fields from the frontmatter data
  function extractFields(obj: any): void {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      // Check if the value is an object and not an array or a primitive value
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        extractFields(value);
      } else {
        // Add the value to the sections array
        sections.push(value);
      }
    });
  }

  extractFields(frontMatter);

  return sections;
}


export default () => {
    // Call the function with the folder path containing MDX files
    return loadAndParseMDXFiles('../../../../cms/pages');
}