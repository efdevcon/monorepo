'use client';

import { NAV_ITEMS } from '@/config/nav-items';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocalStorage } from 'usehooks-ts';

export default function NewDeployment() {
  const pathname = usePathname();
  const [appDeploymentId, setAppDeploymentId] = useLocalStorage('app-deployment-id', '');
  const [latestDeploymentId, setLatestDeploymentId] = useState(appDeploymentId);

  useEffect(() => {
    const fetchDeploymentId = async (loadType: string) => {
      try {
        const res = await fetch('/api/deployment');
        const data = await res.json();
        const newDeploymentId = data.deploymentId;
        if (newDeploymentId && newDeploymentId !== appDeploymentId) {
          // only update the app deployment id on first load
          if (loadType === 'first-load') {
            setAppDeploymentId(newDeploymentId);
          }
          setLatestDeploymentId(newDeploymentId);
        }
      } catch (error) {
        console.error('Failed to fetch deployment ID:', error);
      }
    };

    // call the api to get the deployment id every 1 minute
    const interval = setInterval(() => fetchDeploymentId('interval-load'), 6000);

    // on first load, fetch the deployment id
    fetchDeploymentId('first-load');

    // Add visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDeploymentId('interval-load');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appDeploymentId, setAppDeploymentId]);

  const newVersionAvailable =
    latestDeploymentId && latestDeploymentId !== '' && latestDeploymentId !== appDeploymentId;

  if (!newVersionAvailable) {
    return null;
  }

  const selectedItem = NAV_ITEMS.find((item) => item.href === pathname);  

  return (
    <nav
    className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-white border-t border-gray-200 h-[90px] pb-[34px] pt-[4px]"
    style={{
      background: selectedItem?.backgroundColor,
      backdropFilter: 'blur(8px)',
    }}
    >
      <div className="flex items-center gap-2 justify-center flex-1 py-1">
        <span className="size-7 flex items-center justify-center overflow-hidden">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><rect x="48" y="48" width="64" height="64" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><rect x="144" y="48" width="64" height="64" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><rect x="48" y="144" width="64" height="64" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><rect x="144" y="144" width="64" height="64" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>
        </span>
        <span className="text-[14px] leading-[14px] font-['Roboto'] text-[#4b4b66] font-semibold">
          New app version available!
        </span>
        <button
          onClick={() => window.location.reload()}
          className="text-[#1B6FAE] transition-colors text-[14px] leading-[14px] font-['Roboto'] font-semibold cursor-pointer"
        >
          Refresh
        </button>
      </div>
    </nav>
  );
}
