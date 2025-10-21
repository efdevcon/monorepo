import { readFile } from 'fs/promises';
import { join } from 'path';
import PasswordForm from './PasswordForm';
import ComingSoonContainer from './ComingSoonContainer';

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
    <ComingSoonContainer content={content}>
      <PasswordForm />
    </ComingSoonContainer>
  );
}

