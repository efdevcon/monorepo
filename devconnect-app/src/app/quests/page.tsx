'use client';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';
import QuestsTab from './QuestsTab';
import RewardsTab from './RewardsTab';
import LeaderboardTab from './LeaderboardTab';
import { NAV_ITEMS } from '@/utils/nav-items';

const navItem = NAV_ITEMS.find((item) => item.href === '/quests');
const navLabel = navItem?.label || 'Quests';
const title = navLabel;

const tabComponents = [QuestsTab, RewardsTab, LeaderboardTab];

export default function QuestsPage() {
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
