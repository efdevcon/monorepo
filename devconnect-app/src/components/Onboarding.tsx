'use client';

import { useAppKit } from '@reown/appkit/react';
// Note: Onboarding doesn't use useWalletManager directly - it manages its own auth flow
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useSignUpOrLogIn,
  useVerifyNewAccount,
  useResendVerificationCode,
  useWaitForLogin,
  useWaitForWalletCreation,
  useAccount,
  useLogout,
  type AuthState,
  useModal,
  getPortalBaseURL,
  useClient,
} from '@getpara/react-sdk';
import { useUser } from '@/hooks/useUser';
import { Separator } from 'lib/components/ui/separator';
import { useLocalStorage } from 'usehooks-ts';
import Loader from 'src/components/Loader';
import Lottie from 'lottie-react';
import WalletLoadingAnimation from '@/images/Wallet-Loading.json';
import Link from 'next/link';

interface OnboardingProps {
  onConnect?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Hook to expose loading states for use in parent components
export function useOnboardingLoading() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasExistingWallet, setHasExistingWallet] = useState(false);
  const [isPwaParam, setIsPwaParam] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const walletType = localStorage.getItem('devconnect_primary_wallet_type');
      setHasExistingWallet(!!walletType);

      const urlParams = new URLSearchParams(window.location.search);
      setIsPwaParam(urlParams.get('pwa') === 'true');

      const params = new URLSearchParams(window.location.search);
      if (params.get('noLoading') === 'true') {
        setIsInitialLoading(false);
        return;
      }
    }

    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const shouldSkipWalletAnimation = hasExistingWallet && isPwaParam;

  return { isInitialLoading, shouldSkipWalletAnimation };
}

export default function Onboarding({ onConnect }: OnboardingProps) {
  const { open } = useAppKit();
  const [authState, setAuthState] = useState<AuthState | undefined>();
  const { user, signOut, sendOtp, verifyOtp, loading, error } = useUser();
  const [email, setEmail] = useLocalStorage('email', '');
  const [verificationCode, setVerificationCode] = useState('');
  const [isResent, setIsResent] = useState(false);
  const [verificationError, setVerificationError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { openModal } = useModal();
  const router = useRouter();
  const [, setForceShowInstallPWA] = useLocalStorage(
    'forceShowInstallPWA',
    false
  );
  const [EOA_FLOW, setEOA_FLOW] = useState(false);
  const [iFrameState, setIFrameState] = useState<
    'closed' | 'loading' | 'loaded'
  >('closed');
  const paraClient = useClient();
  const [isResetting, setIsResetting] = useState(false);

  // PWA Install State
  const [pwa] = useLocalStorage<boolean | null>('pwa', null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [hasExistingWallet, setHasExistingWallet] = useState(false);
  const [isPwaParam, setIsPwaParam] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for existing wallet type and pwa parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const walletType = localStorage.getItem('devconnect_primary_wallet_type');
      setHasExistingWallet(!!walletType);

      const urlParams = new URLSearchParams(window.location.search);
      setIsPwaParam(urlParams.get('pwa') === 'true');
    }
  }, []);

  // Handle initial loading state for 2.5 seconds (skip if noLoading=true)
  useEffect(() => {
    // Check if noLoading parameter is present
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('noLoading') === 'true') {
        // Skip loading animation for noLoading
        setIsInitialLoading(false);
        return;
      }
    }

    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Read search params after mounting to avoid SSR issues
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setEOA_FLOW(urlParams.get('eoa') === 'true');
    }
  }, [mounted]);

  // Debug logging to understand email value changes
  useEffect(() => {
    if (mounted) {
      console.log('Onboarding email value changed:', email);
    }
  }, [email, mounted]);

  useEffect(() => {
    if (user?.email && email === '') {
      console.log('Setting email from user object:', user.email);
      setEmail(user.email);
    }
  }, [user?.email, email, setEmail]);

  // Clear email error when email changes
  useEffect(() => {
    if (emailError) {
      setEmailError('');
    }
  }, [email]);

  // Clear verification error when verification code changes
  useEffect(() => {
    if (verificationError) {
      setVerificationError('');
    }
  }, [verificationCode]);

  // Auto-submit OTP when 6 digits are entered
  useEffect(() => {
    if (otp && otp.length === 6 && !otpVerified && otpSent) {
      const timer = setTimeout(() => {
        handleOtpSubmit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [otp, otpVerified, otpSent]);

  // Para authentication hooks
  const { signUpOrLogIn, isPending: isSigningUpOrLoggingIn } =
    useSignUpOrLogIn();
  const { verifyNewAccount, isPending: isVerifyingNewAccount } =
    useVerifyNewAccount();
  const {
    resendVerificationCodeAsync: resendVerificationCode,
    isPending: isResending,
  } = useResendVerificationCode();
  const { waitForLogin, isPending: isWaitingForLogin } = useWaitForLogin();
  const { waitForWalletCreation, isPending: isWaitingForWalletCreation } =
    useWaitForWalletCreation();
  const { isConnected } = useAccount();
  const { logout } = useLogout();

  const shouldCancelPolling = useRef(false);

  // Debug: Log connection state
  useEffect(() => {
    console.log('🔍 [ONBOARDING] Connection state:', { isConnected });
  }, [isConnected]);

  // Reset polling when authState changes to login/signup stage
  // This prevents stuck "waiting" states from previous polling attempts
  useEffect(() => {
    if (authState?.stage === 'login' || authState?.stage === 'signup') {
      console.log('🔄 [ONBOARDING] AuthState is login/signup, canceling any ongoing polling');
      shouldCancelPolling.current = true;
      
      // Reset the flag after a brief delay to allow new polling to start
      setTimeout(() => {
        shouldCancelPolling.current = false;
      }, 100);
    }
  }, [authState?.stage]);

  // Handle delayed redirects (1.5 seconds)
  useEffect(() => {
    if (isConnected) {
      // Set redirecting state immediately when connected
      setIsRedirecting(true);

      const redirectTimer = setTimeout(
        () => {
          if (localStorage.getItem('showOnboardingIntro') !== 'true') {
            localStorage.setItem('showOnboardingIntro', 'true');
            router.push('/onboarding/intro');
          } else {
            // If user has already seen the intro, redirect to home
            router.push('/');
          }
        },
        // Wait 800ms before redirecting if initial loading, otherwise wait 0ms
        isInitialLoading ? 800 : 0
      );

      return () => {
        clearTimeout(redirectTimer);
        setIsRedirecting(false);
      };
    }
  }, [isConnected, isInitialLoading, router]);

  const isIframeLoading = iFrameState === 'loading';
  const isIframeClosed = iFrameState === 'closed';

  // Setup polling for the Para login process to complete
  const pollLogin = () => {
    // Reset the cancellation flag
    shouldCancelPolling.current = false;
    waitForLogin(
      {
        // Check the cancellation flag
        isCanceled: () => shouldCancelPolling.current,
      },
      {
        onSuccess: ({ needsWallet }) => {
          console.log('✅ [ONBOARDING] Login polling succeeded!', { needsWallet });
          if (needsWallet) {
            console.log('🔄 [ONBOARDING] Wallet needed, waiting for wallet creation...');
            waitForWalletCreation(
              {
                // Also check cancellation for wallet creation
                isCanceled: () => shouldCancelPolling.current,
              },
              {
                onSuccess: ({ recoverySecret }) => {
                  console.log('✅ [ONBOARDING] Wallet creation succeeded!');
                  // Set redirecting state immediately when wallet creation succeeds
                  setIsRedirecting(true);
                },
                onError: (error) => {
                  // Para SDK may throw internal errors during wallet setup that don't affect functionality
                  console.warn('⚠️ [ONBOARDING] Wallet creation error (may be internal SDK issue):', error);
                  // Still try to redirect if we're connected
                  if (isConnected) {
                    setIsRedirecting(true);
                  }
                },
              }
            );
          } else {
            console.log('✅ [ONBOARDING] No wallet needed, setting redirecting state');
            // Set redirecting state immediately when login succeeds (no wallet needed)
            setIsRedirecting(true);
          }
        },
        onError: (error) => {
          // Para SDK may throw internal errors during login that don't affect functionality
          console.warn('⚠️ [ONBOARDING] Login polling error (may be internal SDK issue):', error);
          // Still try to redirect if we're connected
          if (isConnected) {
            setIsRedirecting(true);
          }
        },
      }
    );
  };

  // Setup polling for the Para signup process to complete
  const pollSignUp = () => {
    // Reset the cancellation flag
    shouldCancelPolling.current = false;
    waitForWalletCreation(
      {
        // Check the cancellation flag
        isCanceled: () => shouldCancelPolling.current,
      },
      {
        onSuccess: ({ recoverySecret }) => {
          // Can optionally give this recovery secret to the user here
          // console.log('🚀 ~ pollSignUp ~ recoverySecret:', recoverySecret);
          // Set redirecting state immediately when signup succeeds
          setIsRedirecting(true);
        },
        onError: (error) => {
          // Para SDK may throw internal errors during signup that don't affect functionality
          console.warn('⚠️ [ONBOARDING] Signup error (may be internal SDK issue):', error);
          // Still try to redirect if we're connected
          if (isConnected) {
            setIsRedirecting(true);
          }
        },
      }
    );
  };

  const setupIframeListener = () => {
    const handleMessage = (event: MessageEvent) => {
      if (!paraClient) {
        return;
      }

      const portalBase = getPortalBaseURL(paraClient.ctx);

      if (!event.origin.startsWith(portalBase)) {
        return; // Ignore messages from untrusted origins
      }

      if (event.data) {
        if (event.data.type === 'LOADED') {
          setIFrameState('loaded');
        }
        // Optionally can listen for height changes of the iframe content
        // if (event.data.type === 'HEIGHT') {
        //   setHeight(event.data.height);
        // }
        if (event.data?.type === 'CLOSE_WINDOW') {
          if (event.data.success) {
            setIFrameState('closed');
          }
          // Cleanup once the closed event is handled
          window.removeEventListener('message', handleMessage);
        }
      }
    };
    window.addEventListener('message', handleMessage);
  };

  const handleWalletConnect = async () => {
    // If email is provided, send OTP first, then open wallet connection
    if (email && email.includes('@')) {
      try {
        await sendOtp(email);
        setOtpSent(true);
      } catch (error) {
        console.error('Failed to send OTP:', error);
        // Still allow wallet connection even if OTP fails
        open();
        onConnect?.();
      }
    } else {
      // Use AppKit for wallet connections directly if no email
      open();
      onConnect?.();
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp || otp.length !== 6 || otpVerified) {
      return;
    }

    try {
      await verifyOtp(email, otp);
      setOtpVerified(true);
    } catch (error) {
      console.error('OTP verification failed:', error);
    }
  };

  const handleConnectWallet = () => {
    open();
    onConnect?.();
  };

  const handleResendOtp = async () => {
    try {
      await sendOtp(email);
    } catch (error) {
      console.error('Failed to resend OTP:', error);
    }
  };

  const handleBackToWallet = () => {
    setOtpSent(false);
    setOtp('');
    setOtpVerified(false);
  };

  // Email validation function using RFC 5322 compliant regex
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // More comprehensive validation
    const strictEmailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!email || email.trim() === '') {
      return false;
    }

    // Basic checks
    if (!emailRegex.test(email)) {
      return false;
    }

    // Additional validation
    if (email.length > 254) {
      return false;
    }

    const [localPart, domain] = email.split('@');

    // Local part (before @) validation
    if (!localPart || localPart.length > 64) {
      return false;
    }

    // Domain validation
    if (!domain || domain.length > 253) {
      return false;
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      return false;
    }

    // Check if starts or ends with dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return false;
    }

    // Use strict regex for final validation
    return strictEmailRegex.test(email);
  };

  const handleEmailSubmit = () => {
    if (!email || !validateEmail(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Clear previous errors
    setEmailError('');

    signUpOrLogIn(
      {
        auth: { email: email.trim() },
      },
      {
        onSuccess: (authState) => {
          console.log('🔑 [ONBOARDING] signUpOrLogIn success:', authState);
          switch (authState?.stage) {
            case 'verify':
              // Only start polling for passkey/password/PIN users when loginUrl is present
              if (!!authState.loginUrl) {
                console.log('🔄 [ONBOARDING] Starting iframe flow with polling');
                setIFrameState('loading');
                setupIframeListener();

                if (authState.nextStage === 'signup') {
                  console.log('🔄 [ONBOARDING] Starting signup polling');
                  pollSignUp();
                } else if (authState.nextStage === 'login') {
                  console.log('🔄 [ONBOARDING] Starting login polling');
                  pollLogin();
                }
              }
              break;
          }

          // Set the state here so the UI reflects properly
          setAuthState(authState);
        },
        onError: (error) => {
          if (error?.message) {
            setEmailError(error.message);
          } else {
            setEmailError(
              'Failed to send verification code. Please try again.'
            );
          }
        },
      }
    );
  };

  const handleVerificationCodeSubmit = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      return;
    }

    // Clear previous error
    setVerificationError('');

    verifyNewAccount(
      {
        verificationCode: verificationCode.trim(), // Trim whitespace
      },
      {
        onSuccess: (authState) => {
          // Set the state here so the UI reflects properly
          setAuthState(authState);
        },
        onError: (error: any) => {
          // Handle specific error cases
          if (
            error?.message?.includes('Account already exists') ||
            error?.message?.includes('already exists')
          ) {
            setVerificationError(
              'This account already exists. Please try logging in instead of signing up.'
            );
          } else if (error?.status === 500) {
            setVerificationError(
              'Server error. Please try again or contact support.'
            );
          } else if (error?.message) {
            setVerificationError(error.message);
          } else {
            setVerificationError(
              'Verification failed. Please check your code and try again.'
            );
          }
        },
      }
    );
  };

  const handleResendCode = async () => {
    try {
      await resendVerificationCode({});
      setIsResent(true);
      setTimeout(() => setIsResent(false), 3000);
    } catch (error) {
      // Handle resend error silently
    }
  };

  // These urls could also be iframed (aside from passkeyUrl) to make the ui more seamless
  const handleOpenWindowClick = (url: string) => () => {
    window.open(url, '_blank', 'noopener,noreferrer');

    switch (authState?.stage) {
      case 'verify':
        // Only start polling for basic auth users, passkey/password/PIN users will start polling later in the flow
        if (!!authState.loginUrl) {
          if (authState.nextStage === 'signup') {
            pollSignUp();
          } else if (authState.nextStage === 'login') {
            pollLogin();
          }
        }
        break;
      case 'signup':
        pollSignUp();
        break;
      case 'login':
        pollLogin();
        break;
    }
  };

  const handleSkip = () => {
    // Set skipped state to allow navigation without connection
    onConnect?.();
    localStorage.setItem('loginIsSkipped', 'true');
    router.push('/');
  };

  const handleReset = () => {
    // Set the cancellation flag
    shouldCancelPolling.current = true;
    setIsResetting(true);
    setAuthState(undefined);
    setVerificationCode('');
    setOtp('');
    setOtpSent(false);
    setOtpVerified(false);
    setIFrameState('closed');
    // Note: Email is preserved so user doesn't have to re-enter it
    localStorage.removeItem('loginIsSkipped');

    // Clear the resetting flag after a longer delay to allow hooks to properly reset
    setTimeout(() => {
      setIsResetting(false);
    }, 500);

    router.push('/onboarding');
  };

  const handleLogout = async () => {
    // Set the cancellation flag before logging out
    shouldCancelPolling.current = true;
    setIsResetting(true);

    try {
      await logout();
      await signOut();
      // Reset the onboarding state after logout
      localStorage.removeItem('loginIsSkipped');
      setAuthState(undefined);
      // Note: Email is preserved so user doesn't have to re-enter it
      setVerificationCode('');
      setOtp('');
      setOtpSent(false);
      setOtpVerified(false);
      setIFrameState('closed');

      // Clear the resetting flag after a longer delay to allow hooks to properly reset
      setTimeout(() => {
        setIsResetting(false);
      }, 500);
    } catch (error) {
      setIsResetting(false);
    }
  };

  const handleBack = () => {
    // Set the cancellation flag when going back
    shouldCancelPolling.current = true;
    setIsResetting(true);
    setAuthState(undefined);
    setVerificationCode('');
    setVerificationError('');
    setIFrameState('closed');

    // Clear the resetting flag after a longer delay to allow hooks to properly reset
    setTimeout(() => {
      setIsResetting(false);
    }, 500);
  };

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWA installed successfully');
        }
        setDeferredPrompt(null);
      });
    } else if (isIOS) {
      // For iOS, show instructions since they can't use the install prompt
      setForceShowInstallPWA(true);
    }
  };

  // PWA Install detection
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // HACK: Hide the w3m-connect-external-widget (Para)
  useEffect(() => {
    // Function to hide widget in a given root
    const hideWidgetInRoot = (root: Document | ShadowRoot) => {
      const widget = root.querySelector('w3m-connect-external-widget');
      if (widget) {
        const style = document.createElement('style');
        style.textContent = `
          w3m-connect-external-widget {
            display: none !important;
          }
        `;
        root.appendChild(style);
        // console.log('Hid w3m-connect-external-widget');
        return true;
      }
      return false;
    };

    // Recursive function to traverse DOM and Shadow DOMs
    const findAndHideWidget = (root: Document | ShadowRoot) => {
      hideWidgetInRoot(root);

      const elements = root.querySelectorAll('*');
      for (const element of elements) {
        if (element.shadowRoot) {
          findAndHideWidget(element.shadowRoot);
        }
      }
    };

    // Function to hide widget when modal is found
    const hideWidgetInModal = () => {
      const modal = document.querySelector('w3m-modal');
      if (modal && modal.shadowRoot) {
        findAndHideWidget(modal.shadowRoot);
      }
    };

    // Set up observer to detect when w3m-modal appears
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'W3M-MODAL') {
                // Wait a bit for shadow root to be available
                setTimeout(hideWidgetInModal, 100);
              }
            }
          }
        }
      }
    });

    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });

    // Also check if modal already exists and check periodically for faster detection
    hideWidgetInModal();
    const interval = setInterval(hideWidgetInModal, 100);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const renderPrivacyPolicyAndTerms = () => {
    return (
      <div className="flex flex-row gap-2 items-center justify-center relative w-full border-[#36364c] mt-2 mb-4">
        <p className="font-normal text-[11px] text-center leading-[1.4] m-4 my-0">
          <span className="text-[#4b4b66]">
            By logging in, you agree to the following: Terms and Conditions{' '}
            <Link
              href="https://www.getpara.com/terms-of-service"
              target="_blank"
              className="text-[#0073de]"
            >
              [1]
            </Link>{' '}
            <Link
              href="https://ethereum.org/en/terms-of-use/"
              target="_blank"
              className="text-[#0073de]"
            >
              [2]
            </Link>{' '}
            and Privacy Policy{' '}
            <Link
              href="https://www.getpara.com/privacy-policy"
              target="_blank"
              className="text-[#0073de]"
            >
              [1]
            </Link>
            <Link
              href="https://ethereum.org/en/privacy-policy"
              target="_blank"
              className="text-[#0073de]"
            >
              [2]
            </Link>
          </span>
        </p>
      </div>
    );
  };

  // Footer
  const renderFooter = () => {
    return (
      <>
        <div className="flex flex-row items-center justify-center pb-2 relative w-full border-[#36364c] mt-5">
          <img src="/images/para.png" alt="Para" className="h-4 w-auto" />
        </div>
      </>
    );
  };

  // Show loading state when processing
  // BUT: Don't show loading if we're in verify stage with iframe - let iframe render while polling happens in background
  // OR if we're resetting - let the reset complete and show the initial screen
  // OR if there's no authState - this means user clicked back and we should return to initial screen
  const isPollingWithIframe =
    authState?.stage === 'verify' && !!(authState as any).loginUrl;

  // Determine if we should skip the wallet loading animation
  const shouldSkipWalletAnimation = hasExistingWallet && isPwaParam;

  // Debug: Log loading states
  useEffect(() => {
    if (isSigningUpOrLoggingIn || isVerifyingNewAccount || isWaitingForLogin || isWaitingForWalletCreation) {
      console.log('🔄 [ONBOARDING] Loading states:', {
        isSigningUpOrLoggingIn,
        isVerifyingNewAccount,
        isWaitingForLogin,
        isWaitingForWalletCreation,
        isPollingWithIframe,
        isResetting,
        authState: authState?.stage,
      });
    }
  }, [isSigningUpOrLoggingIn, isVerifyingNewAccount, isWaitingForLogin, isWaitingForWalletCreation, isPollingWithIframe, isResetting, authState]);

  if (
    (isSigningUpOrLoggingIn ||
      isVerifyingNewAccount ||
      isWaitingForLogin ||
      isWaitingForWalletCreation) &&
    !isPollingWithIframe &&
    !isResetting &&
    authState !== undefined
  ) {
    return (
      <div className="relative size-full flex justify-center items-center">
        {/* Content Wrapper */}
        <div className="relative flex flex-col items-center justify-start gap-0 py-8 w-full">
          {/* Logo */}
          <div className="w-full max-w-[244px] h-auto aspect-[244/77] flex-shrink-0 mb-6">
            <img
              src="/images/ethereum-worlds-fair-logo.png"
              alt="Ethereum World's Fair"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Main Content Container */}
          <div
            className="box-border flex flex-col gap-0 items-center justify-center pt-6 px-3 relative rounded-[1px] w-full max-w-[450px] flex-shrink-0 min-h-[500px]"
            style={{
              background:
                'linear-gradient(127deg, rgba(242, 249, 255, 0.35) 8.49%, rgba(116, 172, 223, 0.35) 100%), #FFF',
            }}
          >
            {/* Main border with shadow */}
            <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

            {/* Back button - position absolute */}
            <button
              onClick={handleLogout}
              className="absolute top-4 left-3 overflow-clip shrink-0 size-5 z-10"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#36364c"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex flex-col gap-0 items-center justify-center p-0 relative w-full">
              {/* Wallet Loading Animation */}
              <Lottie
                animationData={WalletLoadingAnimation}
                loop={true}
                className="w-[260px] h-[260px] object-contain"
              />

              {/* Loading text */}
              <div className="flex flex-col gap-2 items-center justify-start text-center w-full mt-2">
                <div className="font-bold text-[#242436] text-[20px] tracking-[-0.1px] w-full">
                  Connecting your wallet to the World's Fair App...
                </div>
                <div className="font-normal text-[#4b4b66] text-[16px] w-full mb-2">
                  This should only take a moment.
                </div>
              </div>
            </div>

            {renderFooter()}
          </div>
        </div>
      </div>
    );
  }

  // Show redirecting state when connected and about to redirect
  if (isRedirecting && !isWaitingForLogin && !isWaitingForWalletCreation) {
    return (
      <div className="relative size-full flex justify-center items-center">
        {/* Content Wrapper */}
        <div className="relative flex flex-col items-center justify-start gap-0 py-8 w-full">
          {/* Logo */}
          <div className="w-full max-w-[244px] h-auto aspect-[244/77] flex-shrink-0 mb-6">
            <img
              src="/images/ethereum-worlds-fair-logo.png"
              alt="Ethereum World's Fair"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Main Content Container */}
          <div
            className="box-border flex flex-col gap-0 items-center justify-center pt-6 px-3 relative rounded-[1px] w-full max-w-[450px] flex-shrink-0 min-h-[500px]"
            style={{
              background:
                'linear-gradient(127deg, rgba(242, 249, 255, 0.35) 8.49%, rgba(116, 172, 223, 0.35) 100%), #FFF',
            }}
          >
            {/* Main border with shadow */}
            <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

            {/* Back button - position absolute */}
            <button
              onClick={handleLogout}
              className="absolute top-4 left-3 overflow-clip shrink-0 size-5 z-10"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#36364c"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex flex-col gap-0 items-center justify-center p-0 relative w-full">
              {/* Wallet Loading Animation */}
              <Lottie
                animationData={WalletLoadingAnimation}
                loop={true}
                className="w-[260px] h-[260px] object-contain"
              />

              {/* Loading text */}
              <div className="flex flex-col gap-2 items-center justify-start text-center w-full mt-2">
                <div className="font-bold text-[#242436] text-[20px] tracking-[-0.1px] w-full">
                  Connecting your wallet to the World's Fair App...
                </div>
                <div className="font-normal text-[#4b4b66] text-[16px] w-full mb-2">
                  This should only take a moment.
                </div>
              </div>
            </div>

            {renderFooter()}
          </div>
        </div>
      </div>
    );
  }

  // OTP verification screen for external wallet connection
  if (otpSent) {
    return (
      <div className="relative size-full flex justify-center items-center">
        {/* Content Wrapper */}
        <div className="relative flex flex-col items-center justify-start gap-0 py-8 w-full">
          {/* Logo */}
          <div className="w-full max-w-[244px] h-auto aspect-[244/77] flex-shrink-0 mb-6">
            <img
              src="/images/ethereum-worlds-fair-logo.png"
              alt="Ethereum World's Fair"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Main Content Container */}
          <div
            className="box-border flex flex-col gap-0 items-center justify-center pt-6 px-6 relative rounded-[1px] w-full max-w-[450px] flex-shrink-0 min-h-[500px]"
            style={{
              background:
                'linear-gradient(127deg, rgba(242, 249, 255, 0.35) 8.49%, rgba(116, 172, 223, 0.35) 100%), #FFF',
            }}
          >
            {/* Main border with shadow */}
            <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

            {/* Back button - position absolute */}
            <button
              onClick={handleBackToWallet}
              className="absolute top-4 left-6 overflow-clip shrink-0 size-5 z-10"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#36364c"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex flex-col gap-0 items-center justify-center p-0 relative w-full">
              {/* Email notification image */}
              <div className="bg-[position:0%_40%] bg-no-repeat bg-size-[100%_115.87%] h-[120px] shadow-[-2px_4px_8px_0px_rgba(0,0,0,0.2)] shrink-0 w-[140px] rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-6">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0073de"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>

              {/* Verification content */}
              <div className="flex flex-col gap-6 items-start justify-start p-0 relative w-full">
                <div className="flex flex-col gap-6 items-center justify-start p-0 relative w-full">
                  {/* Email sent message */}
                  <div className="flex flex-col gap-[5px] items-start justify-start text-center w-full">
                    <div className="font-normal text-[#36364c] text-[14px] w-full">
                      We&apos;ve sent a verification code to
                    </div>
                    <div className="font-bold text-[#242436] text-[16px] tracking-[-0.1px] w-full">
                      {mounted ? email : ''}
                    </div>
                  </div>

                  {/* OTP Input - only show when not verified */}
                  {!otpVerified && (
                    <div className="flex flex-row gap-1 items-center justify-start p-0 relative">
                      <div className="flex flex-row gap-1 items-center justify-start">
                        {[0, 1, 2].map((index) => (
                          <div
                            key={index}
                            className="relative shrink-0 size-10"
                          >
                            <div className="absolute bg-[#ffffff] left-0 rounded-[1px] size-10 top-0 border border-[#d6d6d6]">
                              <input
                                ref={(el) => {
                                  if (el) {
                                    // Store ref for focus management
                                    (el as any)._index = index;
                                  }
                                }}
                                type="text"
                                maxLength={1}
                                className="w-full h-full text-center text-[20px] font-normal text-[#36364c] bg-transparent border-none outline-none"
                                value={otp[index] || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const newOtp = otp.split('');
                                  newOtp[index] = value;
                                  const updatedOtp = newOtp.join('');
                                  setOtp(updatedOtp);

                                  // Move focus to next input if character entered
                                  if (value && index < 5) {
                                    const target = e.target as HTMLInputElement;
                                    const nextInput =
                                      target.parentElement?.parentElement?.parentElement?.nextElementSibling?.querySelector(
                                        'input'
                                      ) ||
                                      target.parentElement?.parentElement?.parentElement?.parentElement?.nextElementSibling?.querySelector(
                                        'input'
                                      );
                                    if (nextInput) {
                                      (nextInput as HTMLInputElement).focus();
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Handle backspace to move to previous input
                                  if (
                                    e.key === 'Backspace' &&
                                    !otp[index] &&
                                    index > 0
                                  ) {
                                    const target = e.target as HTMLInputElement;
                                    const prevInput =
                                      target.parentElement?.parentElement?.parentElement?.previousElementSibling?.querySelector(
                                        'input'
                                      ) ||
                                      target.parentElement?.parentElement?.parentElement?.parentElement?.previousElementSibling?.querySelector(
                                        'input'
                                      );
                                    if (prevInput) {
                                      (prevInput as HTMLInputElement).focus();
                                    }
                                  }
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedData =
                                    e.clipboardData.getData('text');
                                  const digits = pastedData
                                    .replace(/\D/g, '')
                                    .slice(0, 6);

                                  if (digits.length === 6) {
                                    setOtp(digits);
                                    // Focus the last input after paste
                                    const inputs =
                                      document.querySelectorAll(
                                        'input[type="text"]'
                                      );
                                    const lastInput = inputs[
                                      inputs.length - 1
                                    ] as HTMLInputElement;
                                    if (lastInput) {
                                      lastInput.focus();
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-row gap-1 items-center justify-start">
                        {[3, 4, 5].map((index) => (
                          <div
                            key={index}
                            className="relative shrink-0 size-10"
                          >
                            <div className="absolute bg-[#ffffff] left-0 rounded-[1px] size-10 top-0 border border-[#d6d6d6]">
                              <input
                                ref={(el) => {
                                  if (el) {
                                    // Store ref for focus management
                                    (el as any)._index = index;
                                  }
                                }}
                                type="text"
                                maxLength={1}
                                className="w-full h-full text-center text-[20px] font-normal text-[#36364c] bg-transparent border-none outline-none"
                                value={otp[index] || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const newOtp = otp.split('');
                                  newOtp[index] = value;
                                  const updatedOtp = newOtp.join('');
                                  setOtp(updatedOtp);

                                  // Move focus to next input if character entered
                                  if (value && index < 5) {
                                    const target = e.target as HTMLInputElement;
                                    const nextInput =
                                      target.parentElement?.parentElement?.parentElement?.nextElementSibling?.querySelector(
                                        'input'
                                      );
                                    if (nextInput) {
                                      (nextInput as HTMLInputElement).focus();
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Handle backspace to move to previous input
                                  if (
                                    e.key === 'Backspace' &&
                                    !otp[index] &&
                                    index > 0
                                  ) {
                                    const target = e.target as HTMLInputElement;
                                    const prevInput =
                                      target.parentElement?.parentElement?.parentElement?.previousElementSibling?.querySelector(
                                        'input'
                                      );
                                    if (prevInput) {
                                      (prevInput as HTMLInputElement).focus();
                                    }
                                  }
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedData =
                                    e.clipboardData.getData('text');
                                  const digits = pastedData
                                    .replace(/\D/g, '')
                                    .slice(0, 6);

                                  if (digits.length === 6) {
                                    setOtp(digits);
                                    // Focus the last input after paste
                                    const inputs =
                                      document.querySelectorAll(
                                        'input[type="text"]'
                                      );
                                    const lastInput = inputs[
                                      inputs.length - 1
                                    ] as HTMLInputElement;
                                    if (lastInput) {
                                      lastInput.focus();
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verify OTP Button or Connect Wallet Button */}
                  {!otpVerified ? (
                    <button
                      onClick={handleOtpSubmit}
                      disabled={!otp || otp.length !== 6 || !!loading}
                      className="bg-[#0073de] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                        {loading ? 'Verifying...' : 'Verify'}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectWallet}
                      className="bg-[#0073de] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors"
                    >
                      <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                        Connect Wallet
                      </span>
                    </button>
                  )}
                </div>

                {/* Success message when verified */}
                {otpVerified && (
                  <div className="flex flex-col gap-[5px] items-center justify-start text-center w-full">
                    <div className="font-normal text-[#16a34a] text-[14px] w-full">
                      ✓ Email verified successfully!
                    </div>
                    <div className="font-normal text-[#4b4b66] text-[12px] w-full">
                      Now connect your wallet to continue
                    </div>
                  </div>
                )}

                {/* Resend code - only show when not verified */}
                {!otpVerified && (
                  <div className="flex flex-col gap-1 items-center justify-start text-center w-full">
                    <div className="font-normal text-[#4b4b66] text-[12px] w-full">
                      Didn&apos;t receive a code?
                    </div>
                    <button
                      onClick={handleResendOtp}
                      disabled={!!loading}
                      className="font-bold text-[#0073de] text-[14px] tracking-[-0.1px] w-full hover:underline disabled:opacity-50"
                    >
                      {loading ? 'Sending...' : 'Resend code'}
                    </button>
                  </div>
                )}

                {/* Back Button - only show when not verified */}
                {!otpVerified && (
                  <button
                    onClick={handleBackToWallet}
                    className="font-bold text-[#0073de] text-[14px] text-center tracking-[-0.1px] w-full leading-none hover:underline"
                  >
                    Back to wallet connection
                  </button>
                )}

                {/* Error Display */}
                {error && (
                  <div className="text-red-500 text-[14px] text-center w-full">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {renderFooter()}
          </div>
        </div>
      </div>
    );
  }

  // Email verification screen
  if (authState?.stage === 'verify') {
    return (
      <div className="relative size-full flex justify-center items-center">
        {/* Content Wrapper */}
        <div className="relative flex flex-col items-center justify-start gap-0 py-8 w-full">
          {/* Logo */}
          <div className="w-full max-w-[244px] h-auto aspect-[244/77] flex-shrink-0 mb-6">
            <img
              src="/images/ethereum-worlds-fair-logo.png"
              alt="Ethereum World's Fair"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Main Content Container */}
          <div
            className="box-border flex flex-col gap-0 items-center justify-center pt-6 px-3 relative rounded-[1px] w-full max-w-[450px] flex-shrink-0 min-h-[500px]"
            style={{
              background:
                'linear-gradient(127deg, rgba(242, 249, 255, 0.35) 8.49%, rgba(116, 172, 223, 0.35) 100%), #FFF',
            }}
          >
            {/* Main border with shadow */}
            <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

            {/* Back button - position absolute */}
            <button
              onClick={handleBack}
              className="absolute top-4 left-3 overflow-clip shrink-0 size-5 z-10"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#36364c"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex flex-col gap-0 items-center justify-center p-0 relative w-full">
              {/* Email notification image - hide when showing iframe */}
              {!authState.loginUrl && (
                <div className="bg-[position:0%_40%] bg-no-repeat bg-size-[100%_115.87%] h-[120px] shadow-[-2px_4px_8px_0px_rgba(0,0,0,0.2)] shrink-0 w-[140px] rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-6">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0073de"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
              )}

              {/* Verification content */}
              <div className="flex flex-col gap-6 items-start justify-start p-0 relative w-full">
                {authState.loginUrl ? (
                  /* Show iframe for passkey/password/PIN flow */
                  <div
                    className={`flex flex-col gap-0 items-center justify-start p-0 relative w-full ${!isIframeLoading && !isIframeClosed ? 'py-2 my-5 bg-white rounded-[10px] border-solid border-[#d6d6d6] border-[1px]' : ''}`}
                  >
                    {isIframeLoading ? (
                      <div className="flex flex-col gap-4 items-center justify-center w-full py-2">
                        <Loader>Sending verification code...</Loader>
                      </div>
                    ) : (
                      isIframeClosed && (
                        <div className="flex flex-col gap-0 items-center justify-center p-0 relative w-full">
                          {/* Wallet Loading Animation */}
                          <Lottie
                            animationData={WalletLoadingAnimation}
                            loop={true}
                            className="w-[260px] h-[260px] object-contain"
                          />

                          {/* Loading text */}
                          <div className="flex flex-col gap-2 items-center justify-start text-center w-full mt-2">
                            <div className="font-bold text-[#242436] text-[20px] tracking-[-0.1px] w-full">
                              Connecting your wallet to the World's Fair App...
                            </div>
                            <div className="font-normal text-[#4b4b66] text-[16px] w-full mb-2">
                              This should only take a moment.
                            </div>
                          </div>
                        </div>
                      )
                    )}
                    <iframe
                      src={authState.loginUrl}
                      style={{
                        border: 'none',
                        borderRadius: '1px',
                        width: isIframeLoading || isIframeClosed ? 0 : '100%',
                        height: isIframeLoading || isIframeClosed ? 0 : '100%',
                        minHeight:
                          isIframeLoading || isIframeClosed ? 0 : '250px',
                        opacity: isIframeLoading || isIframeClosed ? 0 : 1,
                      }}
                    />
                  </div>
                ) : (
                  /* Show verification code input for basic email auth */
                  <div className="flex flex-col gap-6 items-center justify-start p-0 relative w-full">
                    {/* Email sent message */}
                    <div className="flex flex-col gap-[5px] items-start justify-start text-center w-full">
                      <div className="font-normal text-[#36364c] text-[14px] w-full">
                        We&apos;ve sent a verification code to
                      </div>
                      <div className="font-bold text-[#242436] text-[16px] tracking-[-0.1px] w-full">
                        {mounted ? email : ''}
                      </div>
                    </div>

                    {/* OTP Input */}
                    <div className="flex flex-row gap-1 items-center justify-start p-0 relative">
                      <div className="flex flex-row gap-1 items-center justify-start">
                        {[0, 1, 2].map((index) => (
                          <div
                            key={index}
                            className="relative shrink-0 size-10"
                          >
                            <div
                              className={`absolute bg-[#ffffff] left-0 rounded-[1px] size-10 top-0 border ${
                                otpVerified
                                  ? 'border-[#16a34a]'
                                  : 'border-[#d6d6d6]'
                              }`}
                            >
                              <input
                                ref={(el) => {
                                  if (el) {
                                    // Store ref for focus management
                                    (el as any)._index = index;
                                  }
                                }}
                                type="text"
                                maxLength={1}
                                className={`w-full h-full text-center text-[20px] font-normal bg-transparent border-none outline-none ${
                                  otpVerified
                                    ? 'text-[#16a34a]'
                                    : 'text-[#36364c]'
                                }`}
                                disabled={otpVerified}
                                value={verificationCode[index] || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const newCode = verificationCode.split('');
                                  newCode[index] = value;
                                  const updatedCode = newCode.join('');
                                  setVerificationCode(updatedCode);

                                  // Move focus to next input if character entered
                                  if (value && index < 5) {
                                    const target = e.target as HTMLInputElement;
                                    const nextInput =
                                      target.parentElement?.parentElement?.parentElement?.nextElementSibling?.querySelector(
                                        'input'
                                      ) ||
                                      target.parentElement?.parentElement?.parentElement?.parentElement?.nextElementSibling?.querySelector(
                                        'input'
                                      );
                                    if (nextInput) {
                                      (nextInput as HTMLInputElement).focus();
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Handle backspace to move to previous input
                                  if (
                                    e.key === 'Backspace' &&
                                    !verificationCode[index] &&
                                    index > 0
                                  ) {
                                    const target = e.target as HTMLInputElement;
                                    const prevInput =
                                      target.parentElement?.parentElement?.parentElement?.previousElementSibling?.querySelector(
                                        'input'
                                      ) ||
                                      target.parentElement?.parentElement?.parentElement?.parentElement?.previousElementSibling?.querySelector(
                                        'input'
                                      );
                                    if (prevInput) {
                                      (prevInput as HTMLInputElement).focus();
                                    }
                                  }
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedData =
                                    e.clipboardData.getData('text');
                                  const digits = pastedData
                                    .replace(/\D/g, '')
                                    .slice(0, 6);

                                  if (digits.length === 6) {
                                    setVerificationCode(digits);
                                    // Focus the last input after paste
                                    const inputs =
                                      document.querySelectorAll(
                                        'input[type="text"]'
                                      );
                                    const lastInput = inputs[
                                      inputs.length - 1
                                    ] as HTMLInputElement;
                                    if (lastInput) {
                                      lastInput.focus();
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-row gap-1 items-center justify-start">
                        {[3, 4, 5].map((index) => (
                          <div
                            key={index}
                            className="relative shrink-0 size-10"
                          >
                            <div
                              className={`absolute bg-[#ffffff] left-0 rounded-[1px] size-10 top-0 border ${
                                otpVerified
                                  ? 'border-[#16a34a]'
                                  : 'border-[#d6d6d6]'
                              }`}
                            >
                              <input
                                ref={(el) => {
                                  if (el) {
                                    // Store ref for focus management
                                    (el as any)._index = index;
                                  }
                                }}
                                type="text"
                                maxLength={1}
                                className={`w-full h-full text-center text-[20px] font-normal bg-transparent border-none outline-none ${
                                  otpVerified
                                    ? 'text-[#16a34a]'
                                    : 'text-[#36364c]'
                                }`}
                                disabled={otpVerified}
                                value={verificationCode[index] || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const newCode = verificationCode.split('');
                                  newCode[index] = value;
                                  const updatedCode = newCode.join('');
                                  setVerificationCode(updatedCode);

                                  // Move focus to next input if character entered
                                  if (value && index < 5) {
                                    const target = e.target as HTMLInputElement;
                                    const nextInput =
                                      target.parentElement?.parentElement?.parentElement?.nextElementSibling?.querySelector(
                                        'input'
                                      );
                                    if (nextInput) {
                                      (nextInput as HTMLInputElement).focus();
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Handle backspace to move to previous input
                                  if (
                                    e.key === 'Backspace' &&
                                    !verificationCode[index] &&
                                    index > 0
                                  ) {
                                    const target = e.target as HTMLInputElement;
                                    const prevInput =
                                      target.parentElement?.parentElement?.parentElement?.previousElementSibling?.querySelector(
                                        'input'
                                      );
                                    if (prevInput) {
                                      (prevInput as HTMLInputElement).focus();
                                    }
                                  }
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedData =
                                    e.clipboardData.getData('text');
                                  const digits = pastedData
                                    .replace(/\D/g, '')
                                    .slice(0, 6);

                                  if (digits.length === 6) {
                                    setVerificationCode(digits);
                                    // Focus the last input after paste
                                    const inputs =
                                      document.querySelectorAll(
                                        'input[type="text"]'
                                      );
                                    const lastInput = inputs[
                                      inputs.length - 1
                                    ] as HTMLInputElement;
                                    if (lastInput) {
                                      lastInput.focus();
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verify Button */}
                    <button
                      onClick={handleVerificationCodeSubmit}
                      disabled={
                        verificationCode.length !== 6 || isVerifyingNewAccount
                      }
                      className="bg-[#0073de] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                        {isVerifyingNewAccount ? 'Verifying...' : 'Verify Code'}
                      </span>
                    </button>

                    {/* Error Display */}
                    {verificationError && (
                      <div className="flex flex-col gap-1 items-center justify-start text-center w-full">
                        <div className="font-normal text-red-500 text-[14px] w-full">
                          {verificationError}
                        </div>
                      </div>
                    )}

                    {/* Resend code */}
                    <div className="flex flex-col gap-1 items-center justify-start text-center w-full">
                      <div className="font-normal text-[#4b4b66] text-[12px] w-full">
                        Didn&apos;t receive a code?
                      </div>
                      <button
                        onClick={handleResendCode}
                        disabled={isResending}
                        className="font-bold text-[#0073de] text-[14px] tracking-[-0.1px] w-full hover:underline disabled:opacity-50"
                      >
                        {isResending
                          ? 'Sending...'
                          : isResent
                            ? 'Code sent!'
                            : 'Resend code'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {renderFooter()}
          </div>
        </div>
      </div>
    );
  }

  // Signup/Login method selection screen
  if (authState?.stage === 'signup' || authState?.stage === 'login') {
    return (
      <div className="relative size-full flex justify-center items-center">
        {/* Content Wrapper */}
        <div className="relative flex flex-col items-center justify-start gap-0 py-8 w-full">
          {/* Logo */}
          <div className="w-full max-w-[244px] h-auto aspect-[244/77] flex-shrink-0 mb-6">
            <img
              src="/images/ethereum-worlds-fair-logo.png"
              alt="Ethereum World's Fair"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Main Content Container */}
          <div
            className="box-border flex flex-col gap-0 items-center justify-center pt-6 px-6 relative rounded-[1px] w-full max-w-[450px] flex-shrink-0 min-h-[500px]"
            style={{
              background:
                'linear-gradient(127deg, rgba(242, 249, 255, 0.35) 8.49%, rgba(116, 172, 223, 0.35) 100%), #FFF',
            }}
          >
            {/* Main border with shadow */}
            <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

            {/* Back button - position absolute */}
            <button
              onClick={handleBack}
              className="absolute top-4 left-6 overflow-clip shrink-0 size-5 z-10"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#36364c"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex flex-col gap-0 items-center justify-center p-0 relative w-full">
              {/* Title centered */}
              <div className="font-semibold text-[#36364c] text-[18px] text-center tracking-[-0.1px] mb-6">
                {authState.stage === 'signup' ? 'Create Account' : 'Sign In'}
              </div>

              {/* Method selection */}
              <div className="flex flex-col gap-4 items-start justify-start p-0 relative w-full mb-4">
                {authState.isPasskeySupported && authState.passkeyUrl && (
                  <button
                    onClick={handleOpenWindowClick(authState.passkeyUrl)}
                    disabled={isWaitingForLogin || isWaitingForWalletCreation}
                    className="bg-[#0073de] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50"
                  >
                    <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                      {isWaitingForLogin || isWaitingForWalletCreation
                        ? 'Setting up...'
                        : authState.stage === 'login'
                          ? 'Login with Passkey'
                          : 'Signup with Passkey'}
                    </span>
                  </button>
                )}

                {authState.passwordUrl && (
                  <button
                    onClick={handleOpenWindowClick(authState.passwordUrl)}
                    disabled={isWaitingForLogin || isWaitingForWalletCreation}
                    className="bg-white flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] w-full border border-[#4b4b66] shadow-[0px_4px_0px_0px_#4b4b66] hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <span className="font-bold text-[#36364c] text-[16px] text-center tracking-[-0.1px] leading-none">
                      {isWaitingForLogin || isWaitingForWalletCreation
                        ? 'Setting up...'
                        : authState.stage === 'login'
                          ? 'Login with Password'
                          : 'Signup with Password'}
                    </span>
                  </button>
                )}

                {authState.pinUrl && (
                  <button
                    onClick={handleOpenWindowClick(authState.pinUrl)}
                    disabled={isWaitingForLogin || isWaitingForWalletCreation}
                    className="bg-white flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] w-full border border-[#4b4b66] shadow-[0px_4px_0px_0px_#4b4b66] hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <span className="font-bold text-[#36364c] text-[16px] text-center tracking-[-0.1px] leading-none">
                      {isWaitingForLogin || isWaitingForWalletCreation
                        ? 'Setting up...'
                        : authState.stage === 'login'
                          ? 'Login with PIN'
                          : 'Signup with PIN'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            {renderFooter()}
          </div>
        </div>
      </div>
    );
  }

  // Get Started Container
  return (
    <div className="relative size-full flex justify-center items-center">
      {/* Content Wrapper - centered container for logo, main content, and install PWA */}
      <div className="relative flex flex-col items-center justify-start gap-6 py-8">
        {/* Logo */}
        <div className="w-full max-w-[244px] h-auto aspect-[244/77] flex-shrink-0">
          <img
            src="/images/ethereum-worlds-fair-logo.png"
            alt="Ethereum World's Fair"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Main Content Container */}
        <div
          className="box-border flex flex-col gap-0 items-center justify-center pt-6 px-6 relative rounded-[1px] w-full max-w-[450px] flex-shrink-0 min-h-[500px]"
          style={{
            background:
              'linear-gradient(127deg, rgba(242, 249, 255, 0.35) 8.49%, rgba(116, 172, 223, 0.35) 100%), #FFF',
          }}
        >
          {/* Main border with shadow */}
          <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

          <div className="flex flex-col gap-0 items-start justify-start p-0 relative w-full">
            {/* Header */}
            <h1 className="font-bold text-[#242436] text-[24px] text-left tracking-[-0.1px] w-full leading-[1.3] mb-4">
              Let's get set up
            </h1>

            {/* First, enter your email address */}
            <div className="flex flex-col gap-4 items-start justify-start p-0 relative w-full mb-4">
              <div className="flex flex-col gap-2 items-start justify-start text-[#242436] text-left w-full">
                <h2 className="font-normal text-[16px] tracking-[-0.1px] w-full leading-[1.5]">
                  Import your event tickets, enable easy crypto payments, and
                  take part in quests.
                </h2>
                <p className="font-normal text-[16px] w-full leading-[1.3]">
                  Use the email you used to order your ticket for instant setup.
                </p>
              </div>

              {/* Email Input */}
              <div className="bg-[#ffffff] box-border content-stretch flex flex-row items-start justify-start p-[12px] relative rounded-[1px] shrink-0 w-full">
                <div
                  className={`absolute border border-solid inset-0 pointer-events-none rounded-[1px] ${
                    emailError ? 'border-red-500' : 'border-zinc-200'
                  }`}
                />
                <div className="basis-0 box-border content-stretch flex flex-row gap-2 grow items-center justify-start min-h-px min-w-px overflow-clip p-0 relative self-stretch shrink-0">
                  <div className="overflow-clip relative shrink-0 size-4">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={emailError ? '#dc2626' : '#353548'}
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={mounted ? email : ''}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value && !validateEmail(value)) {
                        setEmailError('Please enter a valid email address');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && mounted && email) {
                        handleEmailSubmit();
                      }
                    }}
                    className="flex flex-col font-['Inter'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#353548] text-[14px] text-left w-full bg-transparent border-none outline-none placeholder:text-[#7c7c99]"
                  />
                </div>
              </div>
            </div>

            {/* THEN Divider */}
            {EOA_FLOW && (
              <div className="relative w-full">
                <div className="h-0 relative w-full">
                  <div className="absolute bottom-[-0.5px] left-0 right-0 top-[-0.5px] border-t border-[#4b4b66] border-dashed"></div>
                </div>
                <div className="bg-white flex flex-col gap-2 items-center justify-center px-2 py-0 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="font-normal text-[#4b4b66] text-[12px] text-center leading-none">
                    THEN
                  </span>
                </div>
              </div>
            )}

            {/* Choose your authentication method */}
            <div className="flex flex-col items-start justify-start p-0 relative w-full mb-4">
              {EOA_FLOW && (
                <div className="flex flex-col gap-2 items-start justify-start text-[#242436] text-left w-full mb-4">
                  <>
                    <h3 className="font-bold text-[16px] tracking-[-0.1px] w-full leading-[1.5]">
                      Choose your authentication method
                    </h3>
                    <p className="font-normal text-[14px] w-full leading-[1.3]">
                      Provide this to get your ticket data in the app.
                    </p>
                  </>
                </div>
              )}

              {/* Continue with Email Button */}
              <button
                onClick={handleEmailSubmit}
                disabled={
                  !mounted ||
                  !email ||
                  !validateEmail(email.trim()) ||
                  isSigningUpOrLoggingIn
                }
                className="bg-[#0073de] mb-6 flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  mounted
                    ? `Email: "${email}", Valid: ${validateEmail(email.trim())}, Disabled: ${!email || !validateEmail(email.trim()) || isSigningUpOrLoggingIn}`
                    : 'Loading...'
                }
              >
                <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                  {isSigningUpOrLoggingIn
                    ? 'Sending...'
                    : 'Continue with Email'}
                </span>
              </button>

              {/* Error Display */}
              {emailError && (
                <div className="flex flex-col gap-1 items-center justify-start text-center w-full">
                  <div className="font-normal text-red-500 text-[14px] w-full">
                    {emailError}
                  </div>
                </div>
              )}

              {/* Wallet creation text */}
              <p className="font-normal text-[#4b4b66] text-[12px] text-center w-full leading-[1.3]">
                A wallet will be created for you during setup
              </p>

              {!EOA_FLOW && renderFooter()}

              {/* Continue with External Wallet Button */}
              {EOA_FLOW && (
                <button
                  onClick={handleWalletConnect}
                  disabled={!mounted || !email || !validateEmail(email.trim())}
                  className="bg-white flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] w-full border border-[#4b4b66] shadow-[0px_4px_0px_0px_#4b4b66] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    mounted
                      ? `Email: "${email}", Valid: ${validateEmail(email.trim())}, Disabled: ${!email || !validateEmail(email.trim())}`
                      : 'Loading...'
                  }
                >
                  <span className="font-bold text-[#36364c] text-[16px] text-center tracking-[-0.1px] leading-none">
                    Continue with External Wallet
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center w-full gap-4 mb-4">
              <Separator className="grow w-auto bg-[rgba(54,54,76,0.2)]" />
              <span className="font-normal text-[12px] text-center leading-none shrink-0">
                OR
              </span>
              <Separator className="grow w-auto bg-[rgba(54,54,76,0.2)]" />
            </div>

            {/* OR Divider */}
            {/* <div className="relative w-full">
              <div className="h-0 relative w-full">
                <div className="absolute bottom-[-0.5px] left-0 right-0 top-[-0.5px] border-t border-[#4b4b66] border-dashed"></div>
              </div>
              <div className="flex flex-col gap-2 items-center justify-center px-2 py-0 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="font-normal text-[#4b4b66] text-[12px] text-center leading-none">
                  OR
                </span>
              </div>
            </div> */}

            {/* Skip for now */}
            <button
              onClick={handleSkip}
              className="font-bold text-[#0073de] text-[16px] text-center tracking-[-0.1px] w-full leading-none hover:underline mb-4"
            >
              Skip for now
            </button>

            {/* Logout Button - Only show when user is logged in */}
            {user && (
              <button
                onClick={handleLogout}
                className="font-bold text-[#dc2626] text-[16px] text-center tracking-[-0.1px] w-full leading-none hover:underline mb-4"
              >
                Account logout
              </button>
            )}

            {renderPrivacyPolicyAndTerms()}
          </div>
          {EOA_FLOW && renderFooter()}
        </div>

        {/* Install PWA Button - Only show if PWA is not installed */}
        {mounted && pwa === false && (
          <button
            onClick={handleInstallPWA}
            className="bg-white border border-[#4b4b66] border-solid box-border flex gap-2 items-center justify-center px-6 py-3 hover:bg-gray-50 transition-colors flex-shrink-0 w-auto"
          >
            <div className="overflow-clip relative shrink-0 size-5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 3.33334V13.3333M10 3.33334L6.66667 6.66668M10 3.33334L13.3333 6.66668M3.33333 13.3333V15C3.33333 15.442 3.50893 15.866 3.82149 16.1785C4.13405 16.4911 4.55797 16.6667 5 16.6667H15C15.442 16.6667 15.866 16.4911 16.1785 16.1785C16.4911 15.866 16.6667 15.442 16.6667 15V13.3333"
                  stroke="#36364C"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-bold text-[#36364c] text-[16px] text-center text-nowrap tracking-[-0.1px] leading-none">
              Install PWA
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
