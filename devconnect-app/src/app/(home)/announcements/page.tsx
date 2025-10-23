'use client';
// import PageLayout from '@/components/PageLayout';
// import { homeTabs } from '../../navigation';
// import cn from 'classnames';
// import css from './announcements.module.scss';
import Announcements from '@/components/Highlights';

export default function AnnouncementsPageContent() {
  return (
    // <PageLayout title="Ethereum World's Fair — Announcements" tabs={homeTabs()}>
    <div className="mt-2">
      <Announcements />
    </div>
    // </PageLayout>
  );
}
