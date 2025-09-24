import { useEffect, useState } from 'react';
import { useUnifiedConnection } from './useUnifiedConnection';
import { fetchAuth } from '@/services/apiClient';

export const useUserAppData = () => {
  const { isConnected } = useUnifiedConnection();
  const [user, setUser] = useState<any>(null);

  const syncUserData = async () => {
    const userData = await fetchAuth('/api/auth/user-data');
    if (userData.success) {
      setUser(userData.data);
    }
  };

  useEffect(() => {
    if (isConnected) {
      syncUserData();
    }
  }, [isConnected]);

  return { user, syncUserData };
};
