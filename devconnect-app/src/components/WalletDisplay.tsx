'use client';

import { useLocalStorage } from 'usehooks-ts';
import { formatAddress } from '@/utils/format';

interface WalletIdentity {
  name: string | null;
  avatar: string | null;
}

interface WalletDisplayProps {
  address: string | null | undefined;
  className?: string;
}

/**
 * Display wallet name with reactivity to identity changes
 * Priority: 1. ENS name, 2. Truncated address
 */
export function WalletDisplay({ address, className }: WalletDisplayProps) {
  const [identityMap] = useLocalStorage<Record<string, WalletIdentity | null>>(
    'wallet_identity_map',
    {}
  );

  if (!address) return <span className={className}>Not connected</span>;

  const addressKey = address.toLowerCase();
  const identity = identityMap[addressKey];

  const displayName = identity?.name || formatAddress(address);

  return <span className={className}>{displayName}</span>;
}

interface WalletAvatarProps {
  address: string | null | undefined;
  fallbackSrc?: string;
  alt?: string;
  className?: string;
}

/**
 * Display wallet avatar with reactivity to identity changes
 * Shows ENS avatar if available, otherwise shows fallback
 */
export function WalletAvatar({
  address,
  fallbackSrc,
  alt = 'avatar',
  className,
}: WalletAvatarProps) {
  const [identityMap] = useLocalStorage<Record<string, WalletIdentity | null>>(
    'wallet_identity_map',
    {}
  );

  if (!address && fallbackSrc) {
    return <img src={fallbackSrc} alt={alt} className={className} />;
  }

  if (!address) {
    return null;
  }

  const addressKey = address.toLowerCase();
  const identity = identityMap[addressKey];
  const avatarSrc = identity?.avatar || fallbackSrc;

  if (!avatarSrc) {
    return null;
  }

  return <img src={avatarSrc} alt={alt} className={className} />;
}

interface WalletAvatarWithFallbackProps {
  address: string | null | undefined;
  walletId?: string;
  connectorIcon?: string;
  walletName?: string;
}

/**
 * Display wallet avatar with full fallback chain for WalletModal
 * Priority: 1. ENS avatar, 2. Connector icon, 3. Browser icon
 */
export function WalletAvatarWithFallback({
  address,
  walletId,
  connectorIcon,
  walletName,
}: WalletAvatarWithFallbackProps) {
  const [identityMap] = useLocalStorage<Record<string, WalletIdentity | null>>(
    'wallet_identity_map',
    {}
  );

  if (!address) {
    // No address - show browser icon fallback
    return (
      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
          />
        </svg>
      </div>
    );
  }

  const addressKey = address.toLowerCase();
  const identity = identityMap[addressKey];

  // Priority 1: ENS avatar
  if (identity?.avatar) {
    return (
      <img
        src={identity.avatar}
        alt="avatar"
        className="w-16 h-16 rounded-lg object-cover"
      />
    );
  }

  // Priority 2: Connector icon
  if (connectorIcon) {
    return (
      <img
        src={connectorIcon}
        alt={walletName || 'wallet'}
        className="w-16 h-16 rounded-lg object-cover"
      />
    );
  }

  // Priority 3: Browser icon fallback
  return (
    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
      <svg
        className="w-8 h-8 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
        />
      </svg>
    </div>
  );
}

