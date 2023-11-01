import React from 'react';

export const useIsStandalone = () => {
  const [standalone, setStandalone] = React.useState<boolean>(false);
  const [offline, setOffline] = React.useState<boolean>(false)

  React.useEffect(() => {
    const handler = ({ matches }: any) => {
      if (matches) {
        setStandalone(true)
      } else {
        setStandalone(false);
      }
    };

    const onlineHandler = () => setOffline(false);
    const offlineHandler = () => setOffline(true);

    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', handler);

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    const matches = window.matchMedia('(display-mode: standalone)').matches;

    if (matches) {
      setStandalone(true);
    }

    if (!navigator.onLine) {
      setOffline(true);
    }

    return () => {
      window.removeEventListener('change', handler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    }
  }, [])

  return standalone || offline;

  // return standalone ? standaloneLink : browserLink;
}