import { readFile } from 'fs/promises';
import { join } from 'path';
import PasswordForm from './PasswordForm';

async function getComingSoonContent() {
  try {
    const filePath = join(process.cwd(), 'COMING_SOON.md');
    const content = await readFile(filePath, 'utf-8');
    
    // Extract just the ASCII art (before the --- separator if it exists)
    const parts = content.split('---');
    return parts[0].trim();
  } catch (error) {
    console.error('Error reading COMING_SOON.md:', error);
    return 'Coming Soon...';
  }
}

export default async function ComingSoonPage() {
  const content = await getComingSoonContent();
  
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-2 py-2"
      style={{ backgroundColor: 'white' }}
    >
      <div className="flex-1 flex items-center justify-center">
        <pre
          className="text-[0.4rem] lg:text-[0.55rem] leading-tight overflow-auto max-w-full select-text"
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            color: '#353548',
          }}
        >
          {content}
        </pre>
      </div>

      <PasswordForm />
    </div>
  );
}

