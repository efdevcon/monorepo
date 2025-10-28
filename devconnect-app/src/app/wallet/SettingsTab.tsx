'use client';

import { useState, useEffect } from 'react';
import {
  useExportPrivateKey,
  useWallet as useParaWallet,
  useAccount as useParaAccount,
  useModal,
  ModalStep,
} from '@getpara/react-sdk';
import cn from 'classnames';
import Icon from '@mdi/react';
import {
  mdiTranslate,
  mdiBug,
  mdiKeyArrowRight,
  mdiSwapHorizontalCircleOutline,
  mdiCloudUpload,
  mdiChevronRight,
  mdiContentCopy,
  mdiClose,
  mdiOpenInNew,
  mdiCodeBraces,
  mdiLockReset,
  mdiLogout,
  mdiLogin,
} from '@mdi/js';
import { validLocales } from '@/i18n/locales';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WalletDisplay, WalletAvatar } from '@/components/WalletDisplay';
import { openReportIssue } from '@/utils/reportIssue';
import { useWallet } from '@/context/WalletContext';
import { useGlobalStore } from '../store.provider';

// Helper function to read cookie value
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Language metadata
const LANGUAGE_METADATA = {
  en: { name: 'English', greeting: 'Hello!' },
  es: { name: 'Español', greeting: '¡Hola!' },
  pt: { name: 'Portugués', greeting: 'Olá!' },
};

const imgPara = '/images/paraLogo.png';
const imgParaFullColor = '/images/PARA - logo Full Color 1.svg';

export default function SettingsTab() {
  // Always get Para wallet data directly from Para SDK
  const paraAccount = useParaAccount();
  const { data: paraWallet } = useParaWallet();
  const { mutate: exportPrivateKey, isPending: isExportingKey } =
    useExportPrivateKey();
  const { openModal } = useModal();
  const router = useRouter();
  const [locale, setLocale] = useState<string>('en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const storeLogout = useGlobalStore((state) => state.logout);

  // Get disconnect function from WalletContext
  const { disconnect, isDisconnecting, address } = useWallet();

  // Extract Para wallet information
  const isParaConnected = paraAccount?.isConnected && !!paraWallet?.address;
  const paraAddress = paraWallet?.address || null;
  const paraEmail = (paraAccount as any)?.embedded?.email || null;

  // Initialize locale from cookie on mount
  useEffect(() => {
    const cookieLocale = getCookie('NEXT_LOCALE');
    if (cookieLocale && validLocales.includes(cookieLocale)) {
      setLocale(cookieLocale);
    }
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    setLocale(newLocale);
    setShowLanguageModal(false);
    // Refresh to re-render with new locale
    router.refresh();
  };

  const handleCopyAddress = () => {
    if (paraAddress) {
      navigator.clipboard.writeText(paraAddress);
      toast.success('Address copied to clipboard');
    }
  };

  const handleExportPrivateKey = () => {
    // Check if Para wallet is connected
    if (!isParaConnected || !paraWallet?.id) {
      toast.error(
        'Private key export is only available when Para wallet is connected'
      );
      return;
    }

    // Export private key using Para SDK
    exportPrivateKey({
      walletId: paraWallet.id,
    });
  };

  const handleReplaceRecoverySecret = () => {
    toast.info('Replace Recovery Secret - Coming soon');
  };

  const handleBackupKit = () => {
    openModal({ step: ModalStep.SECRET });
  };

  const handleProvideFeedback = () => {
    openReportIssue();
  };

  const handleDebugClick = () => {
    router.push('/wallet/debug');
  };

  const handleResetEarlyAccess = async () => {
    try {
      // Call API to delete the httpOnly cookie
      const response = await fetch('/api/early-access/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Early access cookie cleared');

        // Redirect to coming soon page if mode is enabled
        router.push('/coming-soon');
        router.refresh();
      } else {
        toast.error('Failed to reset early access');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const handleLogout = async () => {
    try {
      await disconnect();

      localStorage.removeItem('loginIsSkipped');
      storeLogout();
      router.push('/onboarding?noLoading=true');

      // toast.success(
      //   <div className="space-y-1">
      //     <div className="font-semibold text-green-800">🔓 Logged Out</div>
      //     <div className="text-sm text-green-700">
      //       Wallet disconnected successfully
      //     </div>
      //   </div>,
      //   {
      //     duration: 3000,
      //     dismissible: true,
      //     closeButton: true,
      //     style: {
      //       background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      //       border: '1px solid #bbf7d0',
      //       borderRadius: '8px',
      //       boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      //     },
      //   }
      // );
    } catch (err) {
      console.error('Logout failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold text-red-800">❌ Logout Failed</div>
          <div className="text-sm text-red-700">{errorMessage}</div>
        </div>,
        {
          duration: 4000,
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
    }
  };

  const handleSignIn = () => {
    router.push('/onboarding?noLoading=true');
  };

  return (
    <div
      className={cn(
        'w-full py-4 sm:py-5 px-4 sm:px-6 mx-auto grow',
        'grow pb-8'
      )}
      style={{
        background:
          'linear-gradient(0deg, rgba(246, 182, 19, 0.15) 6.87%, rgba(255, 133, 166, 0.15) 14.79%, rgba(152, 148, 255, 0.15) 22.84%, rgba(116, 172, 223, 0.15) 43.68%, rgba(238, 247, 255, 0.15) 54.97%), #FFF',
      }}
    >
      {/* App Section */}
      <div className="mb-6">
        <h2 className="text-[#20202b] text-lg font-bold mb-3">App</h2>

        {/* Language */}
        <button
          onClick={() => setShowLanguageModal(true)}
          className="w-full border-b border-[#ededf0] flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <Icon path={mdiTranslate} size={1} className="text-[#353548]" />
          </div>
          <p className="flex-1 text-left text-[#353548] text-base font-medium">
            Language
          </p>
          <div className="flex items-center gap-2">
            <div className="bg-white border border-[#353548] px-1.5 py-1">
              <p className="text-[#353548] text-xs font-semibold tracking-wider">
                {locale.toUpperCase()}
              </p>
            </div>
            <Icon
              path={mdiChevronRight}
              size={0.65}
              className="text-[#4b4b66]"
            />
          </div>
        </button>

        {/* Provide Feedback */}
        <button
          onClick={handleProvideFeedback}
          className="w-full border-b border-[#ededf0] flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <Icon path={mdiBug} size={1} className="text-[#353548]" />
          </div>
          <p className="flex-1 text-left text-[#353548] text-base font-medium">
            Provide feedback
          </p>
          <Icon path={mdiOpenInNew} size={0.65} className="text-[#4b4b66]" />
        </button>

        {/* Reset Early Access */}
        <button
          onClick={handleResetEarlyAccess}
          className="w-full border-b border-[#ededf0] flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <Icon path={mdiLockReset} size={1} className="text-[#353548]" />
          </div>
          <p className="flex-1 text-left text-[#353548] text-base font-medium">
            Reset early access
          </p>
          <Icon path={mdiChevronRight} size={0.65} className="text-[#4b4b66]" />
        </button>
      </div>

      {/* Wallet Section */}
      <div className="">
        <h2 className="text-[#20202b] text-lg font-bold mb-3">Wallet</h2>

        {/* Account Details Card - Always shows Para wallet info */}
        <div className="bg-white border border-[#ededf0] rounded-[4px] p-4 mb-4">
          <div className="flex gap-4 items-start">
            {/* Profile Avatar */}
            <div className="relative w-8 h-8 shrink-0">
              <WalletAvatar
                address={paraAddress}
                fallbackSrc={imgPara}
                alt="Para wallet"
                className="w-8 h-8 rounded-full"
              />
            </div>

            {/* Account Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[#4b4b66] text-xs mb-2">Para Wallet Account</p>
              <p className="text-[#20202b] text-sm font-medium mb-2 truncate">
                {paraEmail || (isParaConnected ? 'Connected' : 'Not connected')}
              </p>
            </div>
          </div>
          {paraAddress && (
            <div className="flex items-center gap-2 text-[#20202b] text-xs font-medium">
              {paraAddress}
              <button
                onClick={handleCopyAddress}
                className="cursor-pointer hover:opacity-70 transition-opacity"
              >
                <Icon path={mdiContentCopy} size={0.55} color="#0073DE" />
              </button>
            </div>
          )}
        </div>

        {/* Logout or Sign In */}
        {isParaConnected ? (
          <button
            onClick={handleLogout}
            disabled={isDisconnecting}
            className={cn(
              'w-full border-b border-[#ededf0] flex items-center gap-4 px-4 py-3 transition-colors',
              isDisconnecting
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50 cursor-pointer'
            )}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <Icon path={mdiLogout} size={1} className="text-[#353548]" />
            </div>
            <p className="flex-1 text-left text-[#353548] text-base font-medium">
              Logout
            </p>
            {isDisconnecting ? (
              <span className="text-[#4b4b66] text-xs">Logging out...</span>
            ) : (
              <Icon
                path={mdiChevronRight}
                size={0.65}
                className="text-[#4b4b66]"
              />
            )}
          </button>
        ) : (
          <button
            onClick={handleSignIn}
            className="bg-[#0073de] w-full flex gap-2 items-center justify-center px-6 py-3 rounded-[1px] shadow-[0px_4px_0px_0px_#005493] cursor-pointer hover:bg-[#0060c0] transition-colors"
          >
            <span className="font-bold text-base text-center text-white">
              Sign in
            </span>
          </button>
        )}

        {/* Export Private Key */}
        <button
          onClick={handleExportPrivateKey}
          disabled={isExportingKey || !isParaConnected}
          className={cn(
            'w-full border-b border-[#ededf0] flex items-center gap-4 px-4 py-3 transition-colors',
            isExportingKey || !isParaConnected
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-50 cursor-pointer'
          )}
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <Icon path={mdiKeyArrowRight} size={1} className="text-[#353548]" />
          </div>
          <p className="flex-1 text-left text-[#353548] text-base font-medium">
            Export Private Key
          </p>
          {isExportingKey ? (
            <span className="text-[#4b4b66] text-xs">Opening...</span>
          ) : (
            <Icon path={mdiOpenInNew} size={0.65} className="text-[#4b4b66]" />
          )}
        </button>

        {/* Replace Recovery Secret */}
        {/* <button
          onClick={handleReplaceRecoverySecret}
          className="w-full border-b border-[#ededf0] flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <Icon
              path={mdiSwapHorizontalCircleOutline}
              size={1}
              className="text-[#353548]"
            />
          </div>
          <p className="flex-1 text-left text-[#353548] text-base font-medium">
            Replace recovery secret
          </p>
          <Icon path={mdiOpenInNew} size={0.65} className="text-[#4b4b66]" />
        </button> */}

        {/* Backup Kit */}
        <button
          onClick={handleBackupKit}
          disabled={isExportingKey || !isParaConnected}
          className={cn(
            'w-full border-b border-[#ededf0] flex items-center gap-4 px-4 py-3 transition-colors',
            isExportingKey || !isParaConnected
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-50 cursor-pointer'
          )}
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <Icon path={mdiCloudUpload} size={1} className="text-[#353548]" />
          </div>
          <p className="flex-1 text-left text-[#353548] text-base font-medium">
            Backup kit
          </p>
          <Icon path={mdiChevronRight} size={0.65} className="text-[#4b4b66]" />
        </button>

        {/* Debug */}
        {address && (
          <button
            onClick={handleDebugClick}
            className="w-full border-b border-[#ededf0] flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <Icon path={mdiCodeBraces} size={1} className="text-[#353548]" />
            </div>
            <p className="flex-1 text-left text-[#353548] text-base font-medium">
              Debug
            </p>
            <Icon
              path={mdiChevronRight}
              size={0.65}
              className="text-[#4b4b66]"
            />
          </button>
        )}

        {/* Provided by Para */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <p className="text-xs text-black">Provided by</p>
          <img src={imgParaFullColor} alt="Para" className="h-4 w-auto" />
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowLanguageModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white border border-[#c7c7d0] rounded p-5 max-w-[353px] w-[calc(100%-40px)] mx-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#20202b] text-lg font-bold">
                Select a language
              </h3>
              <button
                onClick={() => setShowLanguageModal(false)}
                className="cursor-pointer hover:opacity-70 transition-opacity"
              >
                <Icon path={mdiClose} size={1} className="text-[#4b4b66]" />
              </button>
            </div>

            {/* Language Options */}
            <div className="flex flex-col gap-2">
              {validLocales.map((loc) => {
                const isSelected = locale === loc;
                const metadata =
                  LANGUAGE_METADATA[loc as keyof typeof LANGUAGE_METADATA];

                return (
                  <button
                    key={loc}
                    onClick={() => handleLanguageChange(loc)}
                    className={cn(
                      'w-full flex items-center justify-between gap-4 p-4 rounded-sm border-2 transition-colors',
                      isSelected
                        ? 'bg-[#eaf4fb] border-[#0073de]'
                        : 'bg-white border-[#ededf0] hover:border-[#c7c7d0]'
                    )}
                  >
                    <p
                      className={cn(
                        'text-base text-left',
                        isSelected ? 'font-bold' : 'font-normal'
                      )}
                    >
                      <span
                        className={cn(isSelected ? 'font-bold' : 'font-bold')}
                      >
                        {metadata.name}
                      </span>{' '}
                      <span className="font-normal">({loc.toUpperCase()})</span>
                    </p>
                    <p className="text-[#4b4b66] text-sm italic text-right">
                      {metadata.greeting}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
