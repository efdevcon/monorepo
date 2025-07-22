'use client';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import ProfileTab from './ProfileTab';
import SettingsTab from './SettingsTab';
import { NAV_ITEMS } from '@/config/nav-items';

const navItem = NAV_ITEMS.find((item) => item.href === '/profile');
const navLabel = navItem?.label || 'Profile';
const title = navLabel;

const tabComponents = [ProfileTab, SettingsTab];

export default function ProfilePage() {
  return (
    <PageLayout title={title}>
      <TabbedSection navLabel={navLabel}>
        {(tabIndex) => {
          const TabComponent =
            tabComponents[tabIndex] || (() => <div>Not found</div>);
          return <TabComponent />;
        }}
      </TabbedSection>
    </PageLayout>
  );
}
