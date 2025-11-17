import { getNotionTable } from '@/services/getNotionTable';
import { writeFileSync } from 'fs';
import { join, resolve } from 'path';

async function fetchAnnouncements() {
  const announcements = await getNotionTable(
    '295638cdc41580fe8d85ff5487f71277',
    undefined,
    undefined,
    'Notification Send Time'
  );
  return announcements;
}

fetchAnnouncements().then((announcements) => {
  const outputPath = resolve(
    __dirname,
    '..',
    'src',
    'data',
    'announcements.json'
  );
  writeFileSync(outputPath, JSON.stringify(announcements, null, 2));
  console.log(`Announcements written to ${outputPath}`);
});
