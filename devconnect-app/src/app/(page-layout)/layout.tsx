'use client';
import { usePathname } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { NAV_ITEMS } from '@/config/nav-items';
import { useEffect } from 'react';

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

  useEffect(() => {
    console.log('scroll to top');
    // window.smoothScrollTo(0, 0);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [pathname]);

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
