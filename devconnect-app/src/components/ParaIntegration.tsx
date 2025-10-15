'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { useConnect } from 'wagmi';
import { useWallet } from '@/context/WalletContext';
import { useModal, useLogout, useIssueJwt } from '@getpara/react-sdk';

// Toast utility functions
const showSuccessToast = (title: string, message?: string, duration = 3000) => {
  toast.success(
    <div className="space-y-1">
      <div className="font-semibold text-green-800">{title}</div>
      {message && <div className="text-sm text-green-700">{message}</div>}
    </div>,
    {
      duration,
      dismissible: true,
      closeButton: true,
      style: {
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }
  );
};

const showErrorToast = (title: string, message?: string, duration = 4000) => {
  toast.error(
    <div className="space-y-1">
      <div className="font-semibold text-red-800">{title}</div>
      {message && <div className="text-sm text-red-700">{message}</div>}
    </div>,
    {
      duration,
      dismissible: true,
      closeButton: true,
      style: {
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }
  );
};

interface ParaIntegrationProps {
  address?: string;
  isPara?: boolean;
  onConnect?: () => void;
}

export default function ParaIntegration({
  address,
  isPara,
  onConnect,
}: ParaIntegrationProps) {
  const { connect, connectors } = useConnect();
  const { para } = useWallet();
  const isParaConnected = para.isConnected;
  const { openModal } = useModal();
  const [isConnectingPara, setIsConnectingPara] = useState(false);
  const [paraError, setParaError] = useState<string | null>(null);
  const [paraSuccess, setParaSuccess] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const { logout } = useLogout();
  const { issueJwtAsync } = useIssueJwt();

  // Find the Para connector for wagmi
  const paraConnector = connectors.find(
    (connector: any) => connector.id === 'para'
  );

  // Check if already connected via Para
  const isAlreadyConnectedViaPara =
    paraConnector &&
    connectors.some(
      (connector: any) => connector.id === 'para' && connector.ready
    );

  const handleDirectParaConnect = async () => {
    if (!paraConnector) {
      console.error('Para connector not found');
      setParaError('Para connector not available');
      return;
    }

    try {
      await connect({ connector: paraConnector });
    } catch (error) {
      console.error('Direct Para connection failed:', error);
      setParaError('Connection failed. Please try again.');
    } finally {
      setIsConnectingPara(false);
    }
  };

  const handleParaJwtExchange = async () => {
    try {
      console.log('🔄 [PARA_JWT] Starting Para JWT exchange process');

      // Show loading toast
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold text-blue-800">
            🔄 Exchanging Para JWT
          </div>
          <div className="text-sm text-blue-700">
            Please complete OTP verification in your Para wallet...
          </div>
        </div>,
        {
          duration: Infinity,
          dismissible: false,
          closeButton: false,
          style: {
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          },
        }
      );

      // After OTP verification and session active
      const { token: paraJwt } = await issueJwtAsync();

      console.log('🔄 [PARA_JWT] Para JWT obtained, exchanging with Supabase');

      const response = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paraJwt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { supabaseJwt } = await response.json();

      // Create Supabase client and set session
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Use signInWithPassword with the JWT as the password, or set the session directly
      await supabase.auth.setSession({
        access_token: supabaseJwt,
        refresh_token: supabaseJwt, // Using the same token as refresh for now
      });

      // get the user from the supabase client
      const { data: user } = await supabase.auth.getUser();
      console.log('🔄 [PARA_JWT] User:', user);

      // Store user data for display
      setUserData(user);

      console.log('🔄 [PARA_JWT] Supabase session set successfully');

      showSuccessToast(
        '✅ JWT Exchange Complete',
        'Para JWT successfully exchanged and Supabase session set'
      );

      console.log('🔄 [PARA_JWT] JWT exchange completed successfully');
    } catch (error) {
      console.error('🔄 [PARA_JWT] JWT exchange failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      showErrorToast('❌ JWT Exchange Failed', errorMessage);
    } finally {
      // Dismiss the loading toast
      toast.dismiss();
    }
  };

  return (
    <div className="bg-white p-4 space-y-4 rounded-lg border border-gray-200">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Para JWT</h3>
        <p className="text-sm text-gray-600 mb-4">
          {address ? `Connected: ${address}` : 'Not connected'}
        </p>

        {/* Connection Status */}
        <div className="text-xs text-gray-500 mb-4">
          <div>
            Para SDK: {isParaConnected ? '✅ Connected' : '❌ Disconnected'}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Direct Para Connection Button */}
        {!isParaConnected && (
          <div className="space-y-2">
            <Button
              onClick={handleDirectParaConnect}
              className="w-full cursor-pointer"
              size="lg"
              variant={isAlreadyConnectedViaPara ? 'default' : 'outline'}
            >
              Connect with Para
            </Button>

            {/* Error message */}
            {paraError && (
              <div className="text-red-500 text-sm text-center">
                {paraError}
              </div>
            )}

            {/* Success message */}
            {paraSuccess && (
              <div className="text-green-600 text-sm text-center">
                ✅ Connected successfully!
              </div>
            )}
          </div>
        )}

        {/* Para JWT Exchange Button - only for Para wallets */}
        {address && isParaConnected && (
          <Button
            onClick={handleParaJwtExchange}
            className="w-full cursor-pointer"
            size="lg"
            variant="outline"
          >
            Get Supabase JWT & info
          </Button>
        )}

        {/* Para Modal Button */}
        {address && isParaConnected && (
          <>
            {' '}
            <Button
              onClick={() => {
                // This would need to be implemented with the Para modal
                console.log('Opening Para modal...');
                openModal();
              }}
              className="w-full cursor-pointer"
              size="lg"
              variant="outline"
            >
              📱 Open Para Modal
            </Button>
            <Button
              onClick={() => {
                console.log('Logging out from Para...');
                logout();
                setUserData(null);
                // HACK: refresh the page after 3 seconds
                setTimeout(() => {
                  window.location.reload();
                }, 3000);
              }}
            >
              Logout
            </Button>
          </>
        )}

        {/* User Information Display */}
        {userData && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">
              User Information from PARA JWT
            </h4>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">Email:</span>
                  <span className="text-blue-700">
                    {userData.user?.email || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">User ID:</span>
                  <span className="text-blue-700 font-mono text-xs">
                    {userData.user?.id || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">
                    Wallet Address:
                  </span>
                  <span className="text-blue-700 font-mono text-xs">
                    {userData.user?.user_metadata?.wallet_address || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">
                    Wallet Type:
                  </span>
                  <span className="text-blue-700">
                    {userData.user?.user_metadata?.wallet_type || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">
                    Email Verified:
                  </span>
                  <span className="text-blue-700">
                    {userData.user?.user_metadata?.email_verified
                      ? '✅ Yes'
                      : '❌ No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">
                    Last Sign In:
                  </span>
                  <span className="text-blue-700">
                    {userData.user?.last_sign_in_at
                      ? new Date(userData.user.last_sign_in_at).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-800">Created:</span>
                  <span className="text-blue-700">
                    {userData.user?.created_at
                      ? new Date(userData.user.created_at).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Additional Metadata */}
              {userData.user?.user_metadata && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <h5 className="font-medium text-blue-800 mb-2">
                    Additional Metadata:
                  </h5>
                  <div className="bg-white p-2 rounded border text-xs">
                    <pre className="whitespace-pre-wrap text-blue-700">
                      {JSON.stringify(userData.user.user_metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
