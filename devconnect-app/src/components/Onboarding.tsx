'use client';

import { useAppKit } from '@reown/appkit/react';
import { useConnect } from 'wagmi';
import { useUnifiedConnection } from '@/hooks/useUnifiedConnection';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useSignUpOrLogIn,
  useVerifyNewAccount,
  useResendVerificationCode,
  useWaitForLogin,
  useWaitForWalletCreation,
  type AuthState,
  useModal,
} from '@getpara/react-sdk';
import { useUser } from '@/hooks/useUser';
import { useLocalStorage } from 'usehooks-ts';

interface OnboardingProps {
  onConnect?: () => void;
}

export default function Onboarding({ onConnect }: OnboardingProps) {
  const { open } = useAppKit();
  const { connect, connectors } = useConnect();
  const { isSkipped, setSkipped } = useUnifiedConnection();
  const [authState, setAuthState] = useState<AuthState | undefined>();
  const { user, signOut, sendOtp, verifyOtp, loading, error } = useUser();
  const [email, setEmail] = useLocalStorage('email', '');
  const [verificationCode, setVerificationCode] = useState('');
  const [isResent, setIsResent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { openModal } = useModal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const EOA_FLOW = searchParams.get('eoa') === 'true';

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

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
    (connector: any) => connector.id === 'para'
  );

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

  const handleEmailSubmit = async () => {
    console.log('handleEmailSubmit called with email:', email);
    if (!email || !email.includes('@')) {
      console.log(
        'Email validation failed - email:',
        email,
        'isValid:',
        email && email.includes('@')
      );
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
      console.error('Para connector not found');
      return;
    }

    try {
      console.log('Forcing wagmi Para connector connection...');
      await connect({ connector: paraConnector });

      // Set Para as primary connector (user intent since they just completed Para auth)
      console.log('Setting Para as primary connector after Para auth');
      // Note: We can't directly call setPrimaryConnectorId here because this is in Onboarding component
      // The unified connection hook will detect this and set it as primary
      console.log('Wagmi Para connector connected successfully');
    } catch (error) {
      console.error('Failed to connect wagmi Para connector:', error);
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
        // Handle wallet creation if needed
        const walletResult = await waitForWalletCreation({
          isCanceled: () => newWindow?.closed || false,
        });
        console.log('Wallet created:', walletResult);
      }

      // Force wagmi connection after successful Para login
      await forceWagmiConnection();

      onConnect?.();
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

      // Force wagmi connection after successful Para signup
      await forceWagmiConnection();

      onConnect?.();
    } catch (error) {
      console.error('Signup failed:', error);
    }
  };

  const handleSkip = () => {
    console.log('handleSkip called');
    // Set skipped state to allow navigation without connection
    if (!isSkipped) {
      setSkipped(true);
      console.log('setSkipped(true) called');
      onConnect?.();

      localStorage.setItem('loginIsSkipped', 'true');
      router.push('/');

      console.log('onConnect callback called');
    } else {
      setSkipped(false);
    }
  };

  const handleReset = () => {
    console.log('[ONBOARDING] Resetting onboarding state');
    setAuthState(undefined);
    setVerificationCode('');
    setOtp('');
    setOtpSent(false);
    setOtpVerified(false);
    console.log(
      '[ONBOARDING] Resetting onboarding state and redirecting to onboarding'
    );
    setSkipped(false);
    router.push('/onboarding');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Reset the onboarding state after logout
      setSkipped(false);
      setAuthState(undefined);
      setEmail('');
      setVerificationCode('');
      setOtp('');
      setOtpSent(false);
      setOtpVerified(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleBack = () => {
    setAuthState(undefined);
    setVerificationCode('');
  };

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

  // Footer
  const renderFooter = () => {
    return (
      <>
        <div className="flex flex-row gap-2 items-center justify-center pt-[6px] relative w-full border-[#36364c]">
          <p className="font-normal text-[12px] text-center leading-[1.4]">
            <span className="text-[#4b4b66]">
              By logging in, you agree to our{' '}
            </span>
            <span className="underline font-bold text-[#1b6fae]">
              Terms and Conditions
            </span>
            <span className="text-[#4b4b66]"> and </span>
            <span className="underline font-bold text-[#1b6fae]">
              Privacy Policy
            </span>
            <span className="text-[#4b4b66]">.</span>
          </p>
        </div>
        <div className="flex flex-row items-center justify-center pb-4 relative w-full border-[#36364c]">
          <img src="/images/para.png" alt="Para" className="h-4 w-auto" />
        </div>
      </>
    );
  };

  // OTP verification screen for external wallet connection
  if (otpSent) {
    return (
      <div className="bg-white box-border flex flex-col gap-6 items-center justify-center pb-0 pt-6 px-6 relative rounded-[1px] w-full">
        {/* Main border with shadow */}
        <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

        <div className="flex flex-col gap-6 items-center justify-center p-0 relative w-full">
          {/* Header */}
          <div className="flex flex-row items-center justify-between p-0 relative w-full">
            <button
              onClick={handleBackToWallet}
              className="overflow-clip relative shrink-0 size-5"
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
            <div className="font-semibold text-[#36364c] text-[18px] text-center tracking-[-0.1px]">
              {otpVerified ? 'Connect Wallet' : 'Verify Code'}
            </div>
            <div className="overflow-clip relative shrink-0 size-5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#36364c"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>

          {/* Email notification image */}
          <div className="bg-[position:0%_40%] bg-no-repeat bg-size-[100%_115.87%] h-[120px] shadow-[-2px_4px_8px_0px_rgba(0,0,0,0.2)] shrink-0 w-[140px] rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1b6fae"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          {/* Verification content */}
          <div className="flex flex-col gap-8 items-start justify-start p-0 relative w-full">
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
                      <div key={index} className="relative shrink-0 size-10">
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
                      <div key={index} className="relative shrink-0 size-10">
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
                  className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                    {loading ? 'Verifying...' : 'Verify'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors"
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
                  className="font-bold text-[#1b6fae] text-[14px] tracking-[-0.1px] w-full hover:underline disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Resend code'}
                </button>
              </div>
            )}

            {/* Back Button - only show when not verified */}
            {!otpVerified && (
              <button
                onClick={handleBackToWallet}
                className="font-bold text-[#1b6fae] text-[14px] text-center tracking-[-0.1px] w-full leading-none hover:underline"
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
    );
  }

  // Email verification screen
  if (authState?.stage === 'verify') {
    return (
      <div className="bg-white box-border flex flex-col gap-6 items-center justify-center pb-0 pt-6 px-6 relative rounded-[1px] w-full">
        {/* Main border with shadow */}
        <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

        <div className="flex flex-col gap-6 items-center justify-center p-0 relative w-full">
          {/* Header */}
          <div className="flex flex-row items-center justify-between p-0 relative w-full">
            <button
              onClick={handleBack}
              className="overflow-clip relative shrink-0 size-5"
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
            <div className="font-semibold text-[#36364c] text-[18px] text-center tracking-[-0.1px]">
              Check your email
            </div>
            <div className="overflow-clip relative shrink-0 size-5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#36364c"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>

          {/* Email notification image */}
          <div className="bg-[position:0%_40%] bg-no-repeat bg-size-[100%_115.87%] h-[120px] shadow-[-2px_4px_8px_0px_rgba(0,0,0,0.2)] shrink-0 w-[140px] rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1b6fae"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>

          {/* Verification content */}
          <div className="flex flex-col gap-8 items-start justify-start p-0 relative w-full">
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
                    <div key={index} className="relative shrink-0 size-10">
                      <div
                        className={`absolute bg-[#ffffff] left-0 rounded-[1px] size-10 top-0 border ${
                          otpVerified ? 'border-[#16a34a]' : 'border-[#d6d6d6]'
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
                            otpVerified ? 'text-[#16a34a]' : 'text-[#36364c]'
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
                            const pastedData = e.clipboardData.getData('text');
                            const digits = pastedData
                              .replace(/\D/g, '')
                              .slice(0, 6);

                            if (digits.length === 6) {
                              setVerificationCode(digits);
                              // Focus the last input after paste
                              const inputs =
                                document.querySelectorAll('input[type="text"]');
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
                    <div key={index} className="relative shrink-0 size-10">
                      <div
                        className={`absolute bg-[#ffffff] left-0 rounded-[1px] size-10 top-0 border ${
                          otpVerified ? 'border-[#16a34a]' : 'border-[#d6d6d6]'
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
                            otpVerified ? 'text-[#16a34a]' : 'text-[#36364c]'
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
                            const pastedData = e.clipboardData.getData('text');
                            const digits = pastedData
                              .replace(/\D/g, '')
                              .slice(0, 6);

                            if (digits.length === 6) {
                              setVerificationCode(digits);
                              // Focus the last input after paste
                              const inputs =
                                document.querySelectorAll('input[type="text"]');
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
                disabled={verificationCode.length !== 6 || isVerifying}
                className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                  {isVerifying ? 'Verifying...' : 'Verify Code'}
                </span>
              </button>
            </div>

            {/* Resend code */}
            <div className="flex flex-col gap-1 items-center justify-start text-center w-full">
              <div className="font-normal text-[#4b4b66] text-[12px] w-full">
                Didn&apos;t receive a code?
              </div>
              <button
                onClick={handleResendCode}
                disabled={isResending}
                className="font-bold text-[#1b6fae] text-[14px] tracking-[-0.1px] w-full hover:underline disabled:opacity-50"
              >
                {isResending
                  ? 'Sending...'
                  : isResent
                    ? 'Code sent!'
                    : 'Resend code'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        {renderFooter()}
      </div>
    );
  }

  // Signup/Login method selection screen
  if (authState?.stage === 'signup' || authState?.stage === 'login') {
    return (
      <div className="bg-white box-border flex flex-col gap-6 items-center justify-center pb-0 pt-6 px-6 relative rounded-[1px] w-full">
        {/* Main border with shadow */}
        <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

        <div className="flex flex-col gap-6 items-center justify-start p-0 relative w-full">
          {/* Header */}
          <div className="flex flex-row items-center justify-between p-0 relative w-full">
            <button
              onClick={handleBack}
              className="overflow-clip relative shrink-0 size-5"
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
            <div className="font-semibold text-[#36364c] text-[18px] text-center tracking-[-0.1px]">
              {authState.stage === 'signup' ? 'Create Account' : 'Sign In'}
            </div>
            <div className="overflow-clip relative shrink-0 size-5"></div>
          </div>

          {/* Method selection */}
          <div className="flex flex-col gap-4 items-start justify-start p-0 relative w-full">
            {authState.isPasskeySupported && authState.passkeyUrl && (
              <button
                onClick={() =>
                  authState.stage === 'signup'
                    ? handleSignupMethod('passkey')
                    : handleLoginMethod('passkey')
                }
                disabled={isWaitingForLogin || isWaitingForWallet}
                className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50"
              >
                <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
                  {isWaitingForLogin || isWaitingForWallet
                    ? 'Setting up...'
                    : 'Continue with Passkey'}
                </span>
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
                className="bg-white flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] w-full border border-[#4b4b66] shadow-[0px_4px_0px_0px_#4b4b66] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <span className="font-bold text-[#36364c] text-[16px] text-center tracking-[-0.1px] leading-none">
                  {isWaitingForLogin || isWaitingForWallet
                    ? 'Setting up...'
                    : 'Continue with Password'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        {renderFooter()}
      </div>
    );
  }

  // Get Started Container
  return (
    <div className="bg-white box-border flex flex-col gap-6 items-center justify-center pb-0 pt-6 px-6 relative rounded-[1px] w-full">
      {/* Main border with shadow */}
      <div className="absolute border border-white border-solid inset-[-0.5px] pointer-events-none rounded-[1.5px] shadow-[0px_8px_0px_0px_#36364c]" />

      <div className="flex flex-col gap-6 items-start justify-start p-0 relative w-full">
        {/* Header */}
        <h1 className="font-bold text-[#242436] text-[24px] text-left tracking-[-0.1px] w-full leading-[1.3]">
          Get started
        </h1>

        {/* First, enter your email address */}
        <div className="flex flex-col gap-4 items-start justify-start p-0 relative w-full">
          <div className="flex flex-col gap-2 items-start justify-start text-[#242436] text-left w-full">
            <h2 className="font-bold text-[16px] tracking-[-0.1px] w-full leading-[1.5]">
              First, enter your email address
            </h2>
            <p className="font-normal text-[14px] w-full leading-[1.3]">
              We require this to identify your account, and add your ticketing
              data to the app.
            </p>
          </div>

          {/* Email Input */}
          <div className="bg-[#ffffff] box-border content-stretch flex flex-row items-start justify-start p-[12px] relative rounded-[1px] shrink-0 w-full">
            <div className="absolute border border-solid border-zinc-200 inset-0 pointer-events-none rounded-[1px]" />
            <div className="basis-0 box-border content-stretch flex flex-row gap-2 grow items-center justify-start min-h-px min-w-px overflow-clip p-0 relative self-stretch shrink-0">
              <div className="overflow-clip relative shrink-0 size-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7c7c99"
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
                className="flex flex-col font-['Inter'] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#7c7c99] text-[14px] text-left w-full bg-transparent border-none outline-none placeholder:text-[#7c7c99]"
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
        <div className="flex flex-col gap-4 items-start justify-start p-0 relative w-full">
          {EOA_FLOW && (
            <div className="flex flex-col gap-2 items-start justify-start text-[#242436] text-left w-full">
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
            disabled={!mounted || !email || !email.includes('@') || isSigningUp}
            className="bg-[#1b6fae] flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] shadow-[0px_4px_0px_0px_#125181] w-full hover:bg-[#125181] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              mounted
                ? `Email: "${email}", Valid: ${email && email.includes('@')}, Disabled: ${!email || !email.includes('@') || isSigningUp}`
                : 'Loading...'
            }
          >
            <span className="font-bold text-white text-[16px] text-center tracking-[-0.1px] leading-none">
              {isSigningUp ? 'Sending...' : 'Continue with Email'}
            </span>
          </button>

          {/* Wallet creation text */}
          <p className="font-normal text-[#4b4b66] text-[12px] text-left w-full leading-[1.3]">
            we&apos;ll create a wallet for you behind the scenes
          </p>

          {!EOA_FLOW && renderFooter()}

          {/* Continue with External Wallet Button */}
          {EOA_FLOW && (
            <button
              onClick={handleWalletConnect}
              disabled={!mounted || !email || !email.includes('@')}
              className="bg-white flex flex-row gap-2 items-center justify-center p-[16px] relative rounded-[1px] w-full border border-[#4b4b66] shadow-[0px_4px_0px_0px_#4b4b66] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                mounted
                  ? `Email: "${email}", Valid: ${email && email.includes('@')}, Disabled: ${!email || !email.includes('@')}`
                  : 'Loading...'
              }
            >
              <span className="font-bold text-[#36364c] text-[16px] text-center tracking-[-0.1px] leading-none">
                Continue with External Wallet
              </span>
            </button>
          )}
        </div>

        {/* OR Divider */}
        <div className="relative w-full">
          <div className="h-0 relative w-full">
            <div className="absolute bottom-[-0.5px] left-0 right-0 top-[-0.5px] border-t border-[#4b4b66] border-dashed"></div>
          </div>
          <div className="bg-white flex flex-col gap-2 items-center justify-center px-2 py-0 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="font-normal text-[#4b4b66] text-[12px] text-center leading-none">
              OR
            </span>
          </div>
        </div>

        {/* Skip for now */}
        <button
          onClick={isSkipped ? handleReset : handleSkip}
          className="font-bold text-[#1b6fae] text-[16px] text-center tracking-[-0.1px] w-full leading-none hover:underline mb-6"
        >
          {isSkipped ? 'Reset (back to onboarding flow)' : 'Skip for now'}
        </button>

        {/* Logout Button - Only show when user is logged in */}
        {user && (
          <button
            onClick={handleLogout}
            className="font-bold text-[#dc2626] text-[16px] text-center tracking-[-0.1px] w-full leading-none hover:underline"
          >
            Account logout
          </button>
        )}
      </div>
      {EOA_FLOW && renderFooter()}
    </div>
  );
}
