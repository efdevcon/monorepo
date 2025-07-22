'use client';

import { useState } from 'react';
import {
  useAccount,
  useModal,
  useWallet,
  useLogout,
  useSignMessage,
} from '@getpara/react-sdk';
import { useSignMessage as useWagmiSignMessage } from 'wagmi';
import Zkp2pOnrampQRCode from '@/components/Zkp2pOnrampQRCode';
import { Notification } from '@/components/Notification';
import { verifySignatureFormat, truncateSignature } from '@/utils/signature';

export default function HomePage() {
  const { openModal } = useModal();
  const { data: account } = useAccount();
  const { data: wallet } = useWallet();
  const { logoutAsync, isPending } = useLogout();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { signMessageAsync: wagmiSignMessageAsync, isPending: isWagmiSigning } =
    useWagmiSignMessage();

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const isConnected = account?.isConnected;
  const address = wallet?.address;

  const handleLogout = async () => {
    try {
      await logoutAsync({
        clearPregenWallets: false, // Keep pre-generated wallets
      });
      console.log('Successfully logged out');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSign = async () => {
    if (!wallet) {
      console.error('No wallet available');
      setNotification({
        message: 'No wallet available',
        type: 'error',
        isVisible: true,
      });
      return;
    }

    console.log('Wallet object:', wallet);
    console.log('Wallet ID:', wallet.id);
    console.log('Wallet address:', wallet.address);

    // Replace with your message
    const message = 'Hello, Para!';

    try {
      // For external EVM wallets, use wagmi's sign message
      if (wallet.isExternal && wallet.type === 'EVM') {
        console.log('Using wagmi for external EVM wallet signing');

        const result = await wagmiSignMessageAsync({
          message,
        });

        console.log('Wagmi signature result:', result);

        // Show notification with signature and verification
        const signature = result;
        const isValidFormat = verifySignatureFormat(signature);
        const truncatedSig = truncateSignature(signature);

        setNotification({
          message: `Signature: ${truncatedSig}\nFormat Valid: ${isValidFormat ? '✓' : '✗'}`,
          type: 'success',
          isVisible: true,
        });
        return;
      }

      // For Para wallets, use Para's sign message
      console.log('Using Para SDK for Para wallet signing');
      const messageBase64 = Buffer.from(message).toString('base64');

      const result = await signMessageAsync({
        walletId: wallet.id,
        messageBase64,
      });

      console.log('Para signature result:', result);

      if ('signature' in result) {
        const signature = result.signature;
        const isValidFormat = verifySignatureFormat(signature);
        const truncatedSig = truncateSignature(signature);

        setNotification({
          message: `Signature: ${truncatedSig}\nFormat Valid: ${isValidFormat ? '✓' : '✗'}`,
          type: 'success',
          isVisible: true,
        });
      }
    } catch (err) {
      console.error('Sign message failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setNotification({
        message: `Signing failed: ${errorMessage}`,
        type: 'error',
        isVisible: true,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-black/50 backdrop-blur-sm p-8 rounded-lg text-white max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Devconnect App</h1>
        <p className="text-center text-gray-300 mb-6">
          Your companion for Devconnect ARG, the first Ethereum World&apos;s
          Fair.
        </p>

        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-center text-gray-300 mb-4">
              Connect your wallet to get started
            </p>
            <button
              onClick={() => openModal()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg mb-2">Welcome!</p>
              <p className="text-sm text-gray-300 mb-4">Connected: {address}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSign}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
                disabled={isSigning || isWagmiSigning}
              >
                {isSigning || isWagmiSigning ? 'Signing...' : 'Sign Message'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
                disabled={isPending}
              >
                {isPending ? 'Logging out...' : 'Logout'}
              </button>
              {address && <Zkp2pOnrampQRCode address={address} />}
            </div>
          </div>
        )}
      </div>

      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() =>
          setNotification((prev) => ({ ...prev, isVisible: false }))
        }
      />
    </div>
  );
}

