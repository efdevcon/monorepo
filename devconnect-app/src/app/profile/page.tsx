'use client';
import PageLayout from '@/components/PageLayout';
import TabbedSection from '@/components/TabbedSection';

export default function ProfilePage() {
  return (
    <PageLayout title="Profile">
      <TabbedSection navLabel="Profile">
        {(tabIndex, tabItem) => (
          <>
            <h1 className="text-2xl font-bold mb-4">{tabItem.label}</h1>
            <p className="text-lg text-gray-600">
              This is the content for the <b>{tabItem.label}</b> tab (index{' '}
              {tabIndex}).
            </p>
          </>
        )}
      </TabbedSection>
    </PageLayout>
  );
}
