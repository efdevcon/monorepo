'use client';

import {
  useAccount,
  useModal,
  useWallet,
  useLogout,
  useSignMessage,
} from '@getpara/react-sdk';
import { useSignMessage as useWagmiSignMessage } from 'wagmi';
import { toast } from 'sonner';
import Zkp2pOnrampQRCode from '@/components/Zkp2pOnrampQRCode';
import { Button } from '@/components/ui/button';
import { verifySignatureFormat, truncateSignature } from '@/utils/signature';

export default function HomePage() {
  const { openModal } = useModal();
  const { data: account } = useAccount();
  const { data: wallet } = useWallet();
  const { logoutAsync, isPending } = useLogout();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { signMessageAsync: wagmiSignMessageAsync, isPending: isWagmiSigning } =
    useWagmiSignMessage();

  const isConnected = account?.isConnected;
  const address = wallet?.address;

  const handleLogout = async () => {
    try {
      await logoutAsync({
        clearPregenWallets: false, // Keep pre-generated wallets
      });
      console.log('Successfully logged out');
      toast.success('Successfully logged out');
    } catch (err) {
      console.error('Logout failed:', err);
      toast.error('Logout failed');
    }
  };

  const handleSign = async () => {
    if (!wallet) {
      console.error('No wallet available');
      toast.error('No wallet available');
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

        toast.success(
          `Signature: ${truncatedSig}\nFormat Valid: ${isValidFormat ? '✓' : '✗'}`
        );
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

        toast.success(
          `Signature: ${truncatedSig}\nFormat Valid: ${isValidFormat ? '✓' : '✗'}`
        );
      }
    } catch (err) {
      console.error('Sign message failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Signing failed: ${errorMessage}`);
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
            <Button onClick={() => openModal()} className="w-full" size="lg">
              Connect Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg mb-2">Welcome!</p>
              <p className="text-sm text-gray-300 mb-4">Connected: {address}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSign}
                className="w-full"
                size="lg"
                disabled={isSigning || isWagmiSigning}
              >
                {isSigning || isWagmiSigning ? 'Signing...' : 'Sign Message'}
              </Button>
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
                size="lg"
                disabled={isPending}
              >
                {isPending ? 'Logging out...' : 'Logout'}
              </Button>
              {address && <Zkp2pOnrampQRCode address={address} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

