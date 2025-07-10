'use client';

import { useAccountContext } from '@/context/account-context';
import WalletLoginButton from '@/components/WalletLoginButton';

export default function HomePage() {
  const { account, loading, logout } = useAccountContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-black/50 backdrop-blur-sm p-8 rounded-lg text-white max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Devconnect App</h1>

        {account ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg mb-2">Welcome!</p>
              <p className="text-sm text-gray-300 mb-4">
                Connected: {account.address.slice(0, 6)}...
                {account.address.slice(-4)}
              </p>
            </div>
            <button
              onClick={logout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-gray-300 mb-4">
              Connect your wallet to get started
            </p>
            <WalletLoginButton
              onError={(error) => {
                if (error && error.trim() !== '') {
                  console.error('Login error:', error);
                  alert(error);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
