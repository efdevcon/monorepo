// prettier-ignore-file
'use client';
import { leaderboardData } from '@/data/leaderboard';
import { useState, useMemo } from 'react';
import Icon from '@mdi/react';
import { mdiStarCircle, mdiOpenInNew } from '@mdi/js';
import { useWallet } from '@/context/WalletContext';
import Image from 'next/image';
import { WalletDisplay, WalletAvatar } from '@/components/WalletDisplay';

// ==================== CONFIGURATION ====================
const TOP_N_THRESHOLD = 300; // Show special highlight for users in top N
const DEFAULT_AVATAR =
  'https://lqwa3qcuyuliiaeu.public.blob.vercel-storage.com/boring-avatars/avatar-0.svg';
// ======================================================

export default function LeaderboardPage() {
  const [showAll, setShowAll] = useState(false);
  const entriesToShow = showAll
    ? leaderboardData
    : leaderboardData.slice(0, 50);

  // Get user addresses
  const { para, eoa } = useWallet();

  const paraAddressKey = para.address?.toLowerCase();
  const eoaAddressKey = eoa.address?.toLowerCase();

  // Find user's position in leaderboard
  const userEntry = useMemo(() => {
    if (!paraAddressKey && !eoaAddressKey) return null;

    return leaderboardData.find((entry) => {
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
      const userRow = document.getElementById(
        `leaderboard-row-${userEntry?.position}`
      );
      userRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Helper to get position medal/icon
  const getPositionDisplay = (position: number) => {
    if (position === 1) {
      return (
        <Image src="/images/top-1.svg" alt="1st Place" width={32} height={32} />
      );
    }
    if (position === 2) {
      return (
        <Image src="/images/top-2.svg" alt="2nd Place" width={32} height={32} />
      );
    }
    if (position === 3) {
      return (
        <Image src="/images/top-3.svg" alt="3rd Place" width={32} height={32} />
      );
    }
    return null;
  };

  return (
    <div className="bg-[#74ACDF10] gradient-background grow pb-8 overflow-x-hidden">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex gap-4 items-start tracking-[-0.1px]">
          <div className="flex-1 flex flex-col gap-2">
            <h1 className="text-[20px] font-bold leading-[1.2] text-[#20202b]">
              Quest Leaderboard
            </h1>
            <p className="text-[14px] font-normal leading-[1.3] text-[#353548]">
              Join us at the Closing Ceremony at 5PM!
            </p>
          </div>
          <div className="w-10 h-10 flex-shrink-0">
            <Image
              src="/images/top-1.svg"
              alt="Trophy"
              width={40}
              height={40}
            />
          </div>
        </div>
        {/* User Achievement Banner - for top N users */}
        {userEntry && (
          <div className="bg-[#fce7b0] rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              {/* <Image
                src={
                  userEntry.position === 1
                    ? '/images/top-1.svg'
                    : userEntry.position === 2
                      ? '/images/top-2.svg'
                      : userEntry.position === 3
                        ? '/images/top-3.svg'
                        : '/images/top-1.svg'
                }
                alt="Trophy"
                width={50}
                height={50}
              /> */}
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  🎉 Congratulations!
                </h3>
                <p className="text-sm text-gray-800">
                  You're ranked #{userEntry.position}! Come claim your prize
                  <span className="font-bold">
                    {' '}
                    at the Closing Ceremony at 5PM
                  </span>
                  . First-come, first-served.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Your Position Card - for all users */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg shadow-sm p-4">
          {userEntry && (
            <div className="flex items-center gap-3">
              <WalletAvatar
                address={userEntry.address}
                fallbackSrc={DEFAULT_AVATAR}
                className="w-12 h-12 rounded-full object-cover"
                alt="Your Avatar"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Your Position</h3>
                <p className="text-sm text-gray-600">
                  You're ranked #{userEntry.position} with {userEntry.score}{' '}
                  POAPs
                </p>
              </div>
            </div>
          )}
          {isUserInTopN ? (
            <>
              <button
                onClick={scrollToUserEntry}
                className="mt-3 w-full px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg transition-colors"
              >
                Jump to My Position
              </button>
              <a
                href="https://collections.poap.xyz/collections/devconnect-arg/25009?tab=collectors"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                See Full Leaderboard
                <Icon path={mdiOpenInNew} size={0.6} />
              </a>
            </>
          ) : (
            <a
              href="https://collections.poap.xyz/collections/devconnect-arg/25009?tab=collectors"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              See Full Leaderboard
              <Icon path={mdiOpenInNew} size={0.6} />
            </a>
          )}
        </div>
        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-2">
          {leaderboardData.slice(0, 3).map((entry, index) => {
            const heights = ['h-38', 'h-42', 'h-36'];
            const orders = [1, 0, 2]; // Show 2nd, 1st, 3rd
            const actualEntry = leaderboardData[orders[index]];
            const colors = [
              'from-gray-300 to-gray-400',
              'from-[#f6b40e] to-yellow-500',
              'from-orange-300 to-orange-400',
            ];
            const trophyImages = [
              '/images/top-2.svg',
              '/images/top-1.svg',
              '/images/top-3.svg',
            ];
            const trophySizes = [38, 48, 36];

            return (
              <div
                key={actualEntry.position}
                className={`bg-gradient-to-b ${colors[index]} rounded-lg ${heights[index]} flex flex-col items-center justify-between p-3 shadow-sm`}
              >
                <div className="flex-shrink-0 mt-1">
                  <Image
                    src={trophyImages[index]}
                    alt={`${actualEntry.position}${actualEntry.position === 1 ? 'st' : actualEntry.position === 2 ? 'nd' : 'rd'} Place`}
                    width={trophySizes[index]}
                    height={trophySizes[index]}
                  />
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white ring-2 ring-white flex items-center justify-center">
                  <img
                    src={actualEntry.avatar || DEFAULT_AVATAR}
                    alt={actualEntry.ensName || 'Avatar'}
                    className="w-full h-full object-cover min-w-full min-h-full"
                  />
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-800 truncate max-w-full px-1 leading-tight">
                    {actualEntry.ensName ||
                      `${actualEntry.address.slice(0, 6)}...`}
                  </p>
                  <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5">
                    {actualEntry.score} POAPs
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {/* Leaderboard Table */}
        <div className="border border-[#ededf0] rounded-[4px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#eaf4fb]">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-[#353548] text-[14px] leading-[1.3] tracking-[-0.1px]">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-[#353548] text-[14px] leading-[1.3] tracking-[-0.1px]">
                    Participant
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-[#353548] text-[14px] leading-[1.3] tracking-[-0.1px]">
                    POAPS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {entriesToShow.map((entry) => {
                  const isCurrentUser =
                    (paraAddressKey &&
                      entry.address.toLowerCase() === paraAddressKey) ||
                    (eoaAddressKey &&
                      entry.address.toLowerCase() === eoaAddressKey);
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
                            : 'bg-white'
                      }`}
                    >
                      <td className="py-3 px-4 w-16">
                        {entry.position <= 3 ? (
                          <div className="flex items-center justify-center w-8 h-8">
                            {getPositionDisplay(entry.position)}
                          </div>
                        ) : (
                          <p className="text-center font-medium text-[#353548] text-[14px] leading-[1.3] tracking-[-0.1px]">
                            {entry.position}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isCurrentUser ? (
                            <WalletAvatar
                              address={entry.address}
                              fallbackSrc={DEFAULT_AVATAR}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
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
                          <div className="flex flex-col gap-0.5 leading-[1.3] tracking-[-0.1px] min-w-0 flex-1">
                            {isCurrentUser ? (
                              <div className="font-medium text-[#353548] text-[14px]">
                                <WalletDisplay address={entry.address} />
                              </div>
                            ) : (
                              <>
                                <p className="font-medium text-[#353548] text-[14px]">
                                  {entry.ensName ||
                                    `${entry.address.slice(0, 10)}...${entry.address.slice(-8)}`}
                                </p>
                                {entry.ensName && (
                                  <p className="font-normal text-[#6f6f85] text-[12px]">
                                    {entry.address.slice(0, 6)}...
                                    {entry.address.slice(-4)}
                                  </p>
                                )}
                              </>
                            )}
                            {isCurrentUser && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Icon
                                  path={mdiStarCircle}
                                  size={0.5}
                                  color={isTopN ? '#9333EA' : '#3B82F6'}
                                />
                                <span
                                  className={`text-xs font-semibold ${isTopN ? 'text-purple-600' : 'text-blue-600'}`}
                                >
                                  You
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-[30px] flex items-center justify-start">
                          <div
                            className={`bg-[#0073de] px-2 py-1.5 rounded-full ${
                              isCurrentUser && isTopN
                                ? 'bg-purple-600'
                                : isCurrentUser
                                  ? 'bg-blue-600'
                                  : 'bg-[#0073de]'
                            }`}
                          >
                            <p className="font-bold text-white text-[14px] leading-[1.3] tracking-[-0.1px]">
                              {entry.score}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Show More/Less Button */}
          {leaderboardData.length > 50 && (
            <div className="bg-white p-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-4 py-2 text-sm font-bold text-[#0073de] hover:text-[#165a8d] hover:bg-[#eaf4fb] rounded-lg transition-colors"
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
