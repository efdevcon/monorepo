'use client';
// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { NAV_ITEMS } from '@/config/nav-items';

// import HighlightsContainer from '@/components/Highlights';
// import AnnouncementsWrapper from '@/components/Announcements';

export default function HomePageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeNavItem = NAV_ITEMS.find((item) =>
    item.isActive ? item.isActive(pathname) : item.href === pathname
  );
  const tabs = activeNavItem?.tabItems || [];

  return (
    <PageLayout
      title={activeNavItem?.longLabel || activeNavItem?.label || ''}
      tabs={tabs.map((tab) => ({
        ...tab,
        component: () => null,
      }))}
    >
      {children}
    </PageLayout>
  );
}
