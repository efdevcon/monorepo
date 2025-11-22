'use client';
import { leaderboardData } from '@/data/leaderboard';
import { useState, useMemo } from 'react';
import Icon from '@mdi/react';
import { mdiStarCircle } from '@mdi/js';
import { useWallet } from '@/context/WalletContext';
import Image from 'next/image';
import { WalletDisplay, WalletAvatar } from '@/components/WalletDisplay';

// ==================== CONFIGURATION ====================
const TOP_N_THRESHOLD = 100; // Show special highlight for users in top N
const DEFAULT_AVATAR = 'https://lqwa3qcuyuliiaeu.public.blob.vercel-storage.com/boring-avatars/avatar-0.svg';
// ======================================================

export default function LeaderboardPage() {
  const [showAll, setShowAll] = useState(false);
  const entriesToShow = showAll ? leaderboardData : leaderboardData.slice(0, 50);
  
  // Get user addresses
  const { para, eoa } = useWallet();
  
  const paraAddressKey = para.address?.toLowerCase();
  const eoaAddressKey = eoa.address?.toLowerCase();
  
  // Find user's position in leaderboard
  const userEntry = useMemo(() => {
    if (!paraAddressKey && !eoaAddressKey) return null;
    
    return leaderboardData.find(entry => {
      const entryAddress = entry.address.toLowerCase();
      return entryAddress === paraAddressKey || entryAddress === eoaAddressKey;
    });
  }, [paraAddressKey, eoaAddressKey]);
  
  const isUserInTopN = userEntry && userEntry.position <= TOP_N_THRESHOLD;
  const isUserHighlighted = userEntry !== null;
  const isUserBeyondTop50 = userEntry && userEntry.position > 50 && !showAll;
  
  // Scroll to user's entry
  const scrollToUserEntry = () => {
    setShowAll(true);
    setTimeout(() => {
      const userRow = document.getElementById(`leaderboard-row-${userEntry?.position}`);
      userRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Helper to get position medal/icon
  const getPositionDisplay = (position: number) => {
    if (position === 1) {
      return (
        <div className="flex items-center justify-center">
          <Image src="/images/top-1.svg" alt="1st Place" width={40} height={40} />
        </div>
      );
    }
    if (position === 2) {
      return (
        <div className="flex items-center justify-center">
          <Image src="/images/top-2.svg" alt="2nd Place" width={38} height={38} />
        </div>
      );
    }
    if (position === 3) {
      return (
        <div className="flex items-center justify-center">
          <Image src="/images/top-3.svg" alt="3rd Place" width={36} height={36} />
        </div>
      );
    }
    return (
      <span className="text-gray-600 font-semibold text-sm">{position}</span>
    );
  };

  // Helper to format address/ENS for non-current users
  const formatAddress = (entry: typeof leaderboardData[0]) => {
    if (entry.ensName) {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{entry.ensName}</span>
          <span className="text-xs text-gray-500 font-mono">
            {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
          </span>
        </div>
      );
    }
    return (
      <span className="font-mono text-sm text-gray-700">
        {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
      </span>
    );
  };

  return (
    <div className="bg-[#74ACDF10] gradient-background grow pb-8 overflow-x-hidden">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3 mb-2">
            <Image src="/images/top-1.svg" alt="Trophy" width={40} height={40} />
            <h1 className="text-2xl font-bold text-gray-900">
              POAP Leaderboard
            </h1>
          </div>
          <p className="text-sm text-gray-600">Join us at the Closing Ceremony at 5PM to claim your prize! Awards will be distributed on a first-come, first-served basis.</p>
          <a 
            href="https://collections.poap.xyz/collections/devconnect-arg/25009?tab=collectors"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
          >
            See full Leaderboard →
          </a>
        </div>

        {/* User Achievement Banner */}
        {isUserInTopN && userEntry && (
          <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-lg shadow-md p-4 text-white animate-pulse">
            <div className="flex items-center gap-3">
              <Image 
                src={
                  userEntry.position === 1 ? '/images/top-1.svg' :
                  userEntry.position === 2 ? '/images/top-2.svg' :
                  userEntry.position === 3 ? '/images/top-3.svg' :
                  '/images/top-1.svg'
                }
                alt="Trophy"
                width={50}
                height={50}
              />
              <div>
                <h3 className="font-bold text-lg">🎉 Congratulations!</h3>
                <p className="text-sm text-purple-100">
                  You're ranked #{userEntry.position} in the top {TOP_N_THRESHOLD}! Keep collecting POAPs!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User Position Card (if not in top N but still on leaderboard) */}
        {isUserHighlighted && !isUserInTopN && userEntry && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <WalletAvatar
                address={userEntry.address}
                fallbackSrc={DEFAULT_AVATAR}
                className="w-12 h-12 rounded-full object-cover"
                alt="Your Avatar"
              />
              <div>
                <h3 className="font-semibold text-gray-900">Your Position</h3>
                <p className="text-sm text-gray-600">
                  You're ranked #{userEntry.position} with {userEntry.score} POAPs
                </p>
              </div>
            </div>
            {isUserBeyondTop50 && (
              <button
                onClick={scrollToUserEntry}
                className="mt-3 w-full px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg transition-colors"
              >
                Jump to My Position
              </button>
            )}
          </div>
        )}

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {leaderboardData.slice(0, 3).map((entry, index) => {
            const heights = ['h-32', 'h-36', 'h-28'];
            const orders = [1, 0, 2]; // Show 2nd, 1st, 3rd
            const actualEntry = leaderboardData[orders[index]];
            const colors = [
              'from-gray-300 to-gray-400',
              'from-yellow-300 to-yellow-500',
              'from-orange-300 to-orange-400',
            ];
            const trophyImages = ['/images/top-2.svg', '/images/top-1.svg', '/images/top-3.svg'];
            const trophySizes = [38, 45, 36];

            return (
              <div
                key={actualEntry.position}
                className={`bg-gradient-to-b ${colors[index]} rounded-t-lg ${heights[index]} flex flex-col items-center justify-end p-2 shadow-md`}
              >
                <div className="mb-1">
                  <Image 
                    src={trophyImages[index]} 
                    alt={`${actualEntry.position}${actualEntry.position === 1 ? 'st' : actualEntry.position === 2 ? 'nd' : 'rd'} Place`} 
                    width={trophySizes[index]} 
                    height={trophySizes[index]} 
                  />
                </div>
                <div className="w-auto h-12 rounded-full overflow-hidden bg-white mb-1">
                  <img
                    src={actualEntry.avatar || DEFAULT_AVATAR}
                    alt={actualEntry.ensName || 'Avatar'}
                    className="w-auto h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-800 truncate max-w-full px-1">
                    {actualEntry.ensName ||
                      `${actualEntry.address.slice(0, 6)}...`}
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {actualEntry.score} POAPs
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                    Rank
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 text-sm">
                    Participant
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                    POAPs
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entriesToShow.map((entry) => {
                  const isCurrentUser = 
                    (paraAddressKey && entry.address.toLowerCase() === paraAddressKey) ||
                    (eoaAddressKey && entry.address.toLowerCase() === eoaAddressKey);
                  const isTopN = entry.position <= TOP_N_THRESHOLD;
                  
                  return (
                  <tr
                    key={entry.position}
                    id={`leaderboard-row-${entry.position}`}
                    className={`transition-colors ${
                      isCurrentUser && isTopN
                        ? 'bg-purple-50 hover:bg-purple-100 border-l-4 border-purple-500'
                        : isCurrentUser
                        ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-3 px-4 w-16 text-center">
                      {getPositionDisplay(entry.position)}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {isCurrentUser ? (
                          <WalletAvatar
                            address={entry.address}
                            fallbackSrc={DEFAULT_AVATAR}
                            className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 object-cover"
                            alt="Avatar"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={entry.avatar || DEFAULT_AVATAR}
                              alt={entry.ensName || 'Avatar'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          {isCurrentUser ? (
                            <div className="font-medium text-gray-900">
                              <WalletDisplay address={entry.address} />
                            </div>
                          ) : (
                            formatAddress(entry)
                          )}
                          {isCurrentUser && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Icon path={mdiStarCircle} size={0.5} color={isTopN ? "#9333EA" : "#3B82F6"} />
                              <span className={`text-xs font-semibold ${isTopN ? 'text-purple-600' : 'text-blue-600'}`}>
                                You
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${
                        isCurrentUser && isTopN
                          ? 'bg-purple-200 text-purple-900'
                          : isCurrentUser
                          ? 'bg-blue-200 text-blue-900'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {entry.score}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Show More/Less Button */}
          {leaderboardData.length > 50 && (
            <div className="border-t border-gray-200 p-4 text-center bg-gray-50">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                {showAll
                  ? 'Show Top 50 Participants'
                  : `Show Top ${leaderboardData.length} Participants`}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

