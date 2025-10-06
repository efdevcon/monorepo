import React from 'react';
import { useGlobalStore } from '@/app/store.provider';
import { RequiresAuthContent } from '@/components/RequiresAuth';
import { useShallow } from 'zustand/react/shallow';

export const RequiresAuthHOC = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const userData = useGlobalStore(useShallow((state: any) => state.userData));

    if (!userData) {
      return (
        <RequiresAuthContent message="This page requires authentication." />
      );
    }

    return <Component {...props} />;
  };
};
