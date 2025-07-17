'use client';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import ProgrammeTab from './ProgrammeTab';
import WorldsFairTab from './WorldsFairTab';
import FavoritesTab from './FavoritesTab';
import { NAV_ITEMS } from '@/utils/nav-items';

const navItem = NAV_ITEMS.find((item) => item.href === '/programme');
const navLabel = navItem?.label || 'Programme';
const title = navLabel;

const tabComponents = [ProgrammeTab, WorldsFairTab, FavoritesTab];

export default function ProgrammePage() {
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
