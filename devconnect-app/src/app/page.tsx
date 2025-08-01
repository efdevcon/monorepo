'use client';

import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useEffect, useState, useRef } from 'react';
import {
  useSignUpOrLogIn,
  useVerifyNewAccount,
  useResendVerificationCode,
  useWaitForLogin,
  useWaitForWalletCreation,
  type AuthState,
} from '@getpara/react-sdk';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const { open } = useAppKit();

  // Prevent hydration mismatch by only rendering connectors on client
  const [isClient, setIsClient] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(true);
  const [authState, setAuthState] = useState<AuthState | undefined>();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isResent, setIsResent] = useState(false);

  // SIWE state for wallet-based login
  const [siweState, setSiweState] = useState<
    'idle' | 'signing' | 'success' | 'error'
  >('idle');
  const [siweMessage, setSiweMessage] = useState('');
  const [siweSignature, setSiweSignature] = useState('');

  // Use refs to track latest state
  const connectionStateRef = useRef({ isConnected, address });
  connectionStateRef.current = { isConnected, address };

  // Consider user connected only after SIWE verification
  const isFullyConnected = isConnected && siweState === 'success';

  // Para authentication hooks
  const { signUpOrLogInAsync: signUpOrLogIn, isPending: isSigningUp } =
    useSignUpOrLogIn();
  const { verifyNewAccountAsync: verifyNewAccount, isPending: isVerifying } =
    useVerifyNewAccount();
  const {
    resendVerificationCodeAsync: resendVerificationCode,
    isPending: isResending,
  } = useResendVerificationCode();
  const { waitForLoginAsync: waitForLogin, isPending: isWaitingForLogin } =
    useWaitForLogin();
  const {
    waitForWalletCreationAsync: waitForWalletCreation,
    isPending: isWaitingForWallet,
  } = useWaitForWalletCreation();

  // Find the Para connector for wagmi
  const paraConnector = connectors.find(
    (connector: any) =>
      connector.id === 'para' ||
      connector.id === 'getpara' ||
      connector.name?.toLowerCase().includes('para')
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Monitor connection state changes
  useEffect(() => {
    console.log('Connection state changed:', {
      isConnected,
      address,
      connector: connectors.find((c) => c.ready),
      timestamp: new Date().toISOString(),
    });
  }, [isConnected, address, connectors]);

  // Monitor Para connector specifically
  useEffect(() => {
    if (paraConnector) {
      console.log('Para connector found:', {
        id: paraConnector.id,
        name: paraConnector.name,
        ready: paraConnector.ready,
      });
    } else {
      console.log(
        'Para connector not found. Available connectors:',
        connectors.map((c) => ({ id: c.id, name: c.name, ready: c.ready }))
      );
    }
  }, [paraConnector, connectors]);

  const handleGetStarted = () => {
    setShowGetStarted(false);
  };

  const handleWalletConnect = () => {
    console.log('Opening AppKit modal...');
    open();
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      return;
    }

    try {
      const result = await signUpOrLogIn({ auth: { email } });
      setAuthState(result);
    } catch (error) {
      console.error('Email signup/login failed:', error);
    }
  };

  const handleVerificationCodeSubmit = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      return;
    }

    try {
      const result = await verifyNewAccount({ verificationCode });
      setAuthState(result);
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  const handleResendCode = async () => {
    try {
      await resendVerificationCode({});
      setIsResent(true);
      setTimeout(() => setIsResent(false), 3000);
    } catch (error) {
      console.error('Resend failed:', error);
    }
  };

  const forceWagmiConnection = async () => {
    if (!paraConnector) {
      console.error(
        'Para connector not found. Available connectors:',
        connectors.map((c: any) => ({ id: c.id, name: c.name }))
      );
      return;
    }

    try {
      console.log('Forcing wagmi Para connector connection...');
      console.log('Para connector state before connection:', {
        id: paraConnector.id,
        name: paraConnector.name,
        ready: paraConnector.ready,
      });

      await connect({ connector: paraConnector });
      console.log('Wagmi Para connector connected successfully');

      // Check connection status after a delay using refs
      setTimeout(() => {
        const currentState = connectionStateRef.current;
        console.log('Checking connection status after Para auth...');
        console.log('Current address:', currentState.address);
        console.log('Current isConnected:', currentState.isConnected);

        // If still not connected, try to reconnect
        if (!currentState.isConnected) {
          console.log('Still not connected, attempting to reconnect...');
          connect({ connector: paraConnector });
        } else {
          console.log('✅ Connection successful!');
          // Clear auth state to return to main screen
          setAuthState(undefined);
          setEmail('');
          setVerificationCode('');
        }
      }, 2000); // Increased delay to allow for state updates
    } catch (error) {
      console.error('Failed to connect wagmi Para connector:', error);
    }
  };

  const handleManualRefresh = () => {
    console.log('Manual refresh triggered');
    window.location.reload();
  };

  const handleSignMessage = async () => {
    try {
      console.log('Signing message: hello world!');
      const signature = await signMessageAsync({ message: 'hello world!' });
      console.log('Message signed successfully:', signature);
      alert(`Message signed! Signature: ${signature}`);
    } catch (error) {
      console.error('Failed to sign message:', error);
      alert('Failed to sign message. Check console for details.');
    }
  };

  const generateSiweMessage = (address: string) => {
    const domain = window.location.host;
    const uri = window.location.origin;
    const issuedAt = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(2, 15);

    const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to the app.

URI: ${uri}
Version: 1
Chain ID: 8453
Nonce: ${nonce}
Issued At: ${issuedAt}`;

    return { message, nonce };
  };

  const handleSiweSignIn = async () => {
    if (!address) {
      console.error('No address available for SIWE');
      return;
    }

    try {
      setSiweState('signing');
      const { message, nonce } = generateSiweMessage(address);
      setSiweMessage(message);

      console.log('Signing SIWE message:', message);
      const signature = await signMessageAsync({ message });

      setSiweSignature(signature);
      setSiweState('success');
      console.log('SIWE signature:', signature);

      // Here you would typically send the signature to your backend for verification
      // For now, we'll just show success
      alert(`SIWE Sign-In successful!\nSignature: ${signature}`);
    } catch (error) {
      console.error('SIWE sign-in failed:', error);
      setSiweState('error');
      alert('SIWE Sign-In failed. Check console for details.');
    }
  };

  const handleLoginMethod = async (method: 'passkey' | 'password') => {
    if (!authState || authState.stage !== 'login') return;

    const popupUrl =
      method === 'passkey' && authState.isPasskeySupported
        ? authState.passkeyUrl!
        : authState.passwordUrl!;

    const newWindow = window.open(popupUrl, `ParaLogin_${method}`);

    try {
      const result = await waitForLogin({
        isCanceled: () => newWindow?.closed || false,
      });

      if (result.needsWallet) {
        const walletResult = await waitForWalletCreation({
          isCanceled: () => newWindow?.closed || false,
        });
        console.log('Wallet created:', walletResult);
      }

      // Wait a bit for Para to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await forceWagmiConnection();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleSignupMethod = async (method: 'passkey' | 'password') => {
    if (!authState || authState.stage !== 'signup') return;

    const popupUrl =
      method === 'passkey' && authState.isPasskeySupported
        ? authState.passkeyUrl!
        : authState.passwordUrl!;

    const newWindow = window.open(popupUrl, `ParaSignup_${method}`);

    try {
      const result = await waitForWalletCreation({
        isCanceled: () => newWindow?.closed || false,
      });
      console.log('Signup completed:', result);

      // Wait a bit for Para to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await forceWagmiConnection();
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  const handleBack = () => {
    setAuthState(undefined);
    setVerificationCode('');
  };

  const handleReset = () => {
    setShowGetStarted(true);
    setAuthState(undefined);
    setEmail('');
    setVerificationCode('');
  };

  // Filter out injected connectors to avoid duplicates with appkit
  const filteredConnectors = connectors.filter(
    (connector) => connector.id !== 'injected'
  );

  // GetStarted Container - only show if not connected
  if (showGetStarted && !isFullyConnected) {
    return (
      <div
        style={{
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '10px',
            }}
          >
            Devconnect ARG Pathfinder
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Your companion for Devconnect ARG, the first Ethereum World's Fair.
          </p>
        </div>

        <button
          onClick={handleGetStarted}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#1b6fae',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Get started
        </button>
      </div>
    );
  }

  // Email verification screen
  if (authState?.stage === 'verify') {
    return (
      <div
        style={{
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            ←
          </button>
          <h2 style={{ margin: 0 }}>Check your email</h2>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
          <p>We've sent a verification code to</p>
          <p style={{ fontWeight: 'bold' }}>{email}</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
            }}
          />
        </div>

        <button
          onClick={handleVerificationCodeSubmit}
          disabled={verificationCode.length !== 6 || isVerifying}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#1b6fae',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            opacity: verificationCode.length !== 6 || isVerifying ? 0.5 : 1,
          }}
        >
          {isVerifying ? 'Verifying...' : 'Verify Code'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Didn't receive a code?
          </p>
          <button
            onClick={handleResendCode}
            disabled={isResending}
            style={{
              background: 'none',
              border: 'none',
              color: '#1b6fae',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {isResending
              ? 'Sending...'
              : isResent
                ? 'Code sent!'
                : 'Resend code'}
          </button>
        </div>
      </div>
    );
  }

  // Signup/Login method selection screen
  if (authState?.stage === 'signup' || authState?.stage === 'login') {
    return (
      <div
        style={{
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            ←
          </button>
          <h2 style={{ margin: 0 }}>
            {authState.stage === 'signup' ? 'Create Account' : 'Sign In'}
          </h2>
        </div>

        <div style={{ marginBottom: '20px' }}>
          {authState.isPasskeySupported && authState.passkeyUrl && (
            <button
              onClick={() =>
                authState.stage === 'signup'
                  ? handleSignupMethod('passkey')
                  : handleLoginMethod('passkey')
              }
              disabled={isWaitingForLogin || isWaitingForWallet}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1b6fae',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                marginBottom: '10px',
                cursor: 'pointer',
                opacity: isWaitingForLogin || isWaitingForWallet ? 0.5 : 1,
              }}
            >
              {isWaitingForLogin || isWaitingForWallet
                ? 'Setting up...'
                : 'Continue with Passkey'}
            </button>
          )}

          {authState.passwordUrl && (
            <button
              onClick={() =>
                authState.stage === 'signup'
                  ? handleSignupMethod('password')
                  : handleLoginMethod('password')
              }
              disabled={isWaitingForLogin || isWaitingForWallet}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'white',
                color: '#36364c',
                border: '1px solid #4b4b66',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                opacity: isWaitingForLogin || isWaitingForWallet ? 0.5 : 1,
              }}
            >
              {isWaitingForLogin || isWaitingForWallet
                ? 'Setting up...'
                : 'Continue with Password'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main connection screen
  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h1
          style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}
        >
          Connect to start exploring
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Choose how you'd like to connect to the Devconnect ARG.
        </p>
      </div>

      {isFullyConnected ? (
        <div style={{ marginBottom: '20px' }}>
          <h2>Connection Status</h2>
          <p>Connected: Yes</p>
          <p>Address: {address || 'None'}</p>
          <p>SIWE Verified: ✅</p>
          <button
            onClick={() => disconnect()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            Disconnect
          </button>
          <button
            onClick={handleManualRefresh}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Manual Refresh
          </button>
          <button
            onClick={handleSignMessage}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '10px',
            }}
          >
            Sign Message
          </button>
        </div>
      ) : isConnected ? (
        <div style={{ marginBottom: '20px' }}>
          <h2>Wallet Connected - Complete SIWE Verification</h2>
          <p>Wallet Address: {address || 'None'}</p>
          <p>Status: Wallet connected, SIWE verification required</p>
          <button
            onClick={handleSiweSignIn}
            disabled={siweState === 'signing'}
            style={{
              padding: '15px 30px',
              backgroundColor:
                siweState === 'success'
                  ? '#4CAF50'
                  : siweState === 'error'
                    ? '#f44336'
                    : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: siweState === 'signing' ? 'not-allowed' : 'pointer',
              opacity: siweState === 'signing' ? 0.6 : 1,
            }}
          >
            {siweState === 'signing'
              ? 'Signing SIWE Message...'
              : siweState === 'success'
                ? '✅ SIWE Verified'
                : siweState === 'error'
                  ? '❌ SIWE Failed - Try Again'
                  : '🔐 Complete Sign-In with Ethereum'}
          </button>
          {siweState === 'error' && (
            <p
              style={{ color: '#f44336', fontSize: '14px', marginTop: '10px' }}
            >
              SIWE verification failed. Please try again.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Wallet Connection */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
              Connect using Ethereum
            </h2>
            <p
              style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}
            >
              Already onchain? Connect and set forth!
            </p>
            <button
              onClick={handleWalletConnect}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#1b6fae',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              🚀 Connect with a wallet
            </button>
          </div>

          {/* Divider */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ borderTop: '1px solid #ddd', position: 'relative' }}>
              <span
                style={{
                  backgroundColor: 'white',
                  padding: '0 10px',
                  color: '#666',
                  fontSize: '12px',
                  position: 'absolute',
                  top: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                OR
              </span>
            </div>
          </div>

          {/* Email Connection */}
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
              New to Ethereum? Connect using Email
            </h2>
            <p
              style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}
            >
              Quick start with email — we'll create a wallet for you behind the
              scenes.
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                marginBottom: '15px',
              }}
            />

            <button
              onClick={handleEmailSubmit}
              disabled={!email || !email.includes('@') || isSigningUp}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'white',
                color: '#36364c',
                border: '1px solid #4b4b66',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                opacity:
                  !email || !email.includes('@') || isSigningUp ? 0.5 : 1,
              }}
            >
              {isSigningUp ? 'Sending...' : 'Connect with email'}
            </button>
          </div>

          {/* Reset button */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={handleReset}
              style={{
                background: 'none',
                border: 'none',
                color: '#1b6fae',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '14px',
              }}
            >
              Reset (back to onboarding flow)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

