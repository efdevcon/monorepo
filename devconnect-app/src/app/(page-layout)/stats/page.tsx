'use client';
import { useEffect, useState } from 'react';
import { fetchAuth } from '@/services/apiClient';
import { Separator } from 'lib/components/ui/separator';
import Icon from '@mdi/react';
import {
  mdiRefresh,
  mdiInformationOutline,
  mdiCheckCircleOutline,
  mdiAccountOutline,
  mdiLinkVariant,
  mdiFileDocumentOutline,
  mdiAlertOutline,
  mdiAlert,
  mdiConsole,
  mdiCreditCardOutline,
  mdiSendOutline,
  mdiCloseCircleOutline,
  mdiAccountMultiple,
  mdiChartBar,
  mdiWeb,
  mdiImageMultiple,
} from '@mdi/js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Configuration
const AVAILABLE_LINKS_WARNING_THRESHOLD = 500; // Show warnings when available links drop below this
const AVAILABLE_LINKS_TARGET = 800; // Target number of available links to maintain

interface StatsData {
  stats: {
    available_links: number;
    claimed_links: number;
    total_links: number;
    total_users: number;
    worldfare_domains?: number;
  };
  hourly_user_creation: Array<{
    hour: string;
    count: number;
  }>;
  hourly_claimed_links: Array<{
    hour: string;
    count: number;
  }>;
  relayers?:
    | {
        payment: {
          address: string;
          balance: string;
          balance_usd: string | null;
          transaction_count: number;
        };
        send: {
          address: string;
          balance: string;
          balance_usd: string | null;
          transaction_count: number;
        };
        eth_price_usd: number | null;
      }
    | { error: string };
  daily_relayer_transactions?: Array<{
    date: string;
    payment: number;
    send: number;
    payment_test: number;
    send_test: number;
    total: number;
    total_test: number;
    payment_value?: number;
    send_value?: number;
    total_value?: number;
  }>;
  transactions_by_address?: Array<{
    address: string;
    payment: number;
    send: number;
    payment_test: number;
    send_test: number;
    total: number;
    total_test: number;
    payment_value?: number;
    send_value?: number;
    total_value?: number;
  }>;
  suspicious_addresses?: Array<{
    address: string;
    payment: number;
    send: number;
    payment_test: number;
    send_test: number;
    total: number;
    total_test: number;
    payment_value?: number;
    send_value?: number;
    total_value?: number;
  }>;
  quest_completions?: Record<string, number>;
  timestamp: string;
}

interface POAPDrop {
  id: number;
  name: string;
  mintCount: number;
  questId?: string;
  verifiedInApp?: number;
}

interface POAPMintStats {
  totalMints: number;
  drops: POAPDrop[];
}

// Function to fetch POAP mint statistics for drops from quests
async function fetchPOAPMintStats(): Promise<POAPMintStats | null> {
  try {
    // Fetch quests from the API
    const questsResponse = await fetch('/api/quests');
    if (!questsResponse.ok) {
      console.error(
        'Failed to fetch quests:',
        questsResponse.status,
        questsResponse.statusText
      );
      return null;
    }

    const questsData = await questsResponse.json();
    if (!questsData.success || !questsData.quests) {
      console.error('Invalid quests response');
      return null;
    }

    // Extract POAP drop IDs from quests where conditionType is "verifyPoap"
    // Create a map of dropId -> questId for later use
    const dropIdToQuestId: Record<number, string> = {};
    const poapDropIds = questsData.quests
      .filter(
        (quest: any) =>
          quest.conditionType === 'verifyPoap' && quest.conditionValues
      )
      .map((quest: any) => {
        const dropId = parseInt(quest.conditionValues);
        if (!isNaN(dropId)) {
          dropIdToQuestId[dropId] = quest.id.toString();
        }
        return dropId;
      })
      .filter((id: number) => !isNaN(id));

    if (poapDropIds.length === 0) {
      console.log('No POAP drops found in quests');
      return { totalMints: 0, drops: [] };
    }

    // Query POAP API for these specific drop IDs
    const query = `
      query GetPOAPDrops($ids: [Int!]!) {
        drops(where: {id: {_in: $ids}}) {
          id
          name
          stats_by_chain_aggregate {
            aggregate {
              sum {
                poap_count
              }
            }
          }
        }
      }
    `;

    const variables = {
      ids: poapDropIds,
    };

    const response = await fetch(
      'https://public.compass.poap.tech/v1/graphql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        'Failed to fetch POAP mint stats:',
        response.status,
        response.statusText
      );
      return null;
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return null;
    }

    // Collect all drops and sum up all the POAP counts
    let totalMints = 0;
    const drops: POAPDrop[] = [];

    if (data.data?.drops) {
      data.data.drops.forEach((drop: any) => {
        const poapCount =
          drop?.stats_by_chain_aggregate?.aggregate?.sum?.poap_count || 0;

        if (drop) {
          // Add to total regardless of count
          totalMints += poapCount;
          // Add to array (including 0 count drops to show all quest POAPs)
          drops.push({
            id: drop.id,
            name: drop.name,
            mintCount: poapCount,
            questId: dropIdToQuestId[drop.id],
          });
        }
      });
    }

    return {
      totalMints,
      drops,
    };
  } catch (error) {
    console.error('Error fetching POAP mint stats:', error);
    return null;
  }
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [poapMintStats, setPoapMintStats] = useState<POAPMintStats | null>(
    null
  );
  const [showAllRegularAddresses, setShowAllRegularAddresses] = useState(false);
  const [showAllDrops, setShowAllDrops] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setAccessDenied(false);

    try {
      // Fetch stats and POAP mint count in parallel
      const [response, poapMints] = await Promise.all([
        fetchAuth<StatsData>('/api/auth/stats'),
        fetchPOAPMintStats(),
      ]);

      if (!response.success) {
        // Check if it's an access denied error
        if (
          response.error === 'Access denied' ||
          response.message?.includes('@ethereum.org')
        ) {
          setAccessDenied(true);
        } else {
          setError(
            response.message || response.error || 'Failed to fetch stats'
          );
        }
        return;
      }

      if (response.data) {
        setStats(response.data);
      }

      if (poapMints !== null && response.data) {
        // Enrich POAP drops with verification counts from quest completions
        const questCompletions = response.data.quest_completions || {};
        const enrichedDrops = poapMints.drops.map((drop) => ({
          ...drop,
          verifiedInApp:
            drop.questId && questCompletions[drop.questId]
              ? questCompletions[drop.questId]
              : 0,
        }));

        // Log mapping for debugging
        console.log('Quest completions:', questCompletions);
        console.log(
          'Sample drops with mapping:',
          enrichedDrops.slice(0, 5).map((d) => ({
            id: d.id,
            name: d.name,
            questId: d.questId,
            verified: d.verifiedInApp,
          }))
        );

        setPoapMintStats({
          ...poapMints,
          drops: enrichedDrops,
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchStats(false);
  }, []);

  const refreshStats = () => {
    fetchStats(true);
  };

  if (loading) {
    return (
      <div className="bg-[#74ACDF10] gradient-background grow pb-8 overflow-x-hidden">
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="bg-[#74ACDF10] gradient-background grow pb-8 overflow-x-hidden">
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Icon path={mdiAlert} size={2} color="#EF4444" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Access Restricted
              </h2>
              <p className="text-gray-600">
                This page is only accessible to users with @ethereum.org email
                addresses.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#74ACDF10] gradient-background grow pb-8 overflow-x-hidden">
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Icon path={mdiCloseCircleOutline} size={2} color="#EF4444" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Error Loading Stats
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={refreshStats}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const claimRate =
    stats.stats.total_links > 0
      ? ((stats.stats.claimed_links / stats.stats.total_links) * 100).toFixed(1)
      : '0';

  const hasRelayerError = stats.relayers && 'error' in stats.relayers;
  const relayers =
    !hasRelayerError && stats.relayers && 'payment' in stats.relayers
      ? stats.relayers
      : null;
  const regularAddresses = stats.transactions_by_address ?? [];
  const suspiciousAddresses = stats.suspicious_addresses ?? [];
  const totalRegularValue = regularAddresses.reduce(
    (sum, addr) => sum + (addr.total_value ?? 0),
    0
  );

  // Calculate last imported CSV file (each file has 100 links, first 200 skipped for testing)
  // 800 links = prod_3 through prod_10 (skipped prod_1 and prod_2)
  const lastImportedFile =
    stats.stats.total_links > 0
      ? `prod_${Math.floor(stats.stats.total_links / 100) + 2}.csv`
      : 'None';

  return (
    <div className="bg-[#74ACDF10] gradient-background grow pb-8 overflow-x-hidden">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Claiming Links Statistics
            </h1>
            <button
              onClick={refreshStats}
              disabled={refreshing}
              className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${
                refreshing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Refresh stats"
            >
              <Icon
                path={mdiRefresh}
                size={0.8}
                className={refreshing ? 'animate-spin' : ''}
                color="#4B5563"
              />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Last updated: {new Date(stats.timestamp).toLocaleString()}
          </p>

          {/* Access Notice */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Icon
                path={mdiInformationOutline}
                size={0.8}
                color="#2563EB"
                className="flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Restricted Access
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  This page is only accessible to authenticated users with
                  @ethereum.org email addresses.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Total Users */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.stats.total_users}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Icon path={mdiAccountMultiple} size={1.3} color="#9333EA" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Created accounts</p>
          </div>

          {/* Available Links */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Available Links
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.stats.available_links}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Icon path={mdiCheckCircleOutline} size={1.3} color="#16A34A" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Ready to be claimed</p>
          </div>

          {/* Claimed Links */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Claimed Links
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.stats.claimed_links}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Icon path={mdiAccountOutline} size={1.3} color="#2563EB" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Already claimed by users
            </p>
          </div>

          {/* Total Links */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Links
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.stats.total_links}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <Icon path={mdiLinkVariant} size={1.3} color="#4B5563" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Total in the system</p>
          </div>

          {/* ENS */}
          {stats.stats.worldfare_domains !== undefined && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">ENS</p>
                  <p className="text-3xl font-bold text-teal-600">
                    {stats.stats.worldfare_domains}
                  </p>
                </div>
                <div className="p-3 bg-teal-100 rounded-full">
                  <Icon path={mdiWeb} size={1.3} color="#0D9488" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <a
                  href="https://opensea.io/collection/worldfair-eth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 underline"
                >
                  worldfair.eth minted
                </a>
              </p>
            </div>
          )}

          {/* POAP Mints */}
          {poapMintStats !== null && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    POAP Mints
                  </p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {poapMintStats.totalMints.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <Icon path={mdiImageMultiple} size={1.3} color="#4F46E5" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Total POAPs from {poapMintStats.drops.length} quest
                {poapMintStats.drops.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* POAP Drops List */}
        {poapMintStats && poapMintStats.drops.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Icon path={mdiImageMultiple} size={0.9} color="#4F46E5" />
              <h2 className="text-xl font-bold text-gray-900">POAP Stats</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              All POAP drops from Devconnect quests with their mint counts
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">
                      #
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-900">
                      Drop ID
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Total Mints
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Verified in App
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Sort drops by mint count (highest first)
                    const sortedDrops = [...poapMintStats.drops].sort(
                      (a, b) => b.mintCount - a.mintCount
                    );
                    // Show first 10 or all depending on toggle
                    const dropsToShow = showAllDrops
                      ? sortedDrops
                      : sortedDrops.slice(0, 10);

                    return dropsToShow.map((drop, index) => (
                      <tr
                        key={drop.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                        <td className="py-2 px-3 text-gray-900">
                          <a
                            href={`https://moments.poap.xyz/drops/${drop.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline font-mono text-xs"
                          >
                            {drop.name}
                          </a>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <a
                            href={`https://poap.gallery/drops/${drop.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline font-mono text-xs"
                          >
                            {drop.id}
                          </a>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-900">
                          {drop.mintCount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-green-600">
                          {drop.verifiedInApp?.toLocaleString() || '0'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-3 text-gray-900" colSpan={3}>
                      Total
                    </td>
                    <td className="py-2 px-3 text-right text-indigo-600">
                      {poapMintStats.totalMints.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-green-600">
                      {poapMintStats.drops
                        .reduce(
                          (sum, drop) => sum + (drop.verifiedInApp || 0),
                          0
                        )
                        .toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Show More/Less Button */}
            {poapMintStats.drops.length > 10 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllDrops(!showAllDrops)}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  {showAllDrops
                    ? `Show Less (Top 10)`
                    : `Show All ${poapMintStats.drops.length} Drops`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hourly User Creation Chart */}
        {stats.hourly_user_creation &&
          stats.hourly_user_creation.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Icon path={mdiChartBar} size={0.9} color="#9333EA" />
                <h2 className="text-xl font-bold text-gray-900">
                  Account Creation Timeline
                </h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Number of accounts created per hour (your local time, since Nov
                14, 2025)
              </p>

              <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.hourly_user_creation}
                    margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="hour"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(value) => {
                        const date = new Date(value + 'Z');
                        return date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                        });
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      label={{
                        value: 'Users',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 12, fill: '#6b7280' },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value + 'Z');
                        return date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        });
                      }}
                      formatter={(value: number) => [
                        `${value} user${value !== 1 ? 's' : ''}`,
                        'Created',
                      ]}
                    />
                    <Bar dataKey="count" fill="#9333EA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary stats */}
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Peak Hour:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {
                        stats.hourly_user_creation.reduce((max, curr) =>
                          curr.count > max.count ? curr : max
                        ).count
                      }{' '}
                      users
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Average:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {(
                        stats.hourly_user_creation.reduce(
                          (sum, curr) => sum + curr.count,
                          0
                        ) / stats.hourly_user_creation.length
                      ).toFixed(1)}{' '}
                      /hr
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Time Range:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {stats.hourly_user_creation.length}h
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-semibold text-purple-600">
                      {stats.stats.total_users} users
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Hourly Claimed Links Chart */}
        {stats.hourly_claimed_links &&
          stats.hourly_claimed_links.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Icon path={mdiLinkVariant} size={0.9} color="#2563EB" />
                <h2 className="text-xl font-bold text-gray-900">
                  Peanut Link Claims Timeline
                </h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Number of peanut links claimed per hour (your local time)
              </p>

              <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.hourly_claimed_links}
                    margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="hour"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(value) => {
                        const date = new Date(value + 'Z');
                        return date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                        });
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      label={{
                        value: 'Claims',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 12, fill: '#6b7280' },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value + 'Z');
                        return date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        });
                      }}
                      formatter={(value: number) => [
                        `${value} claim${value !== 1 ? 's' : ''}`,
                        'Claimed',
                      ]}
                    />
                    <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary stats */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Peak Hour:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {
                        stats.hourly_claimed_links.reduce((max, curr) =>
                          curr.count > max.count ? curr : max
                        ).count
                      }{' '}
                      claims
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Average:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {(
                        stats.hourly_claimed_links.reduce(
                          (sum, curr) => sum + curr.count,
                          0
                        ) / stats.hourly_claimed_links.length
                      ).toFixed(1)}{' '}
                      /hr
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Time Range:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {stats.hourly_claimed_links.length}h
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-semibold text-blue-600">
                      {stats.stats.claimed_links} claims
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="mb-2 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Claim Progress
            </h3>
            <span
              className={`text-2xl font-bold ${
                stats.stats.available_links < AVAILABLE_LINKS_WARNING_THRESHOLD
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {claimRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                stats.stats.available_links < AVAILABLE_LINKS_WARNING_THRESHOLD
                  ? 'bg-red-600'
                  : 'bg-green-600'
              }`}
              style={{ width: `${claimRate}%` }}
            ></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Claimed:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {stats.stats.claimed_links} / {stats.stats.total_links}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Remaining:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {stats.stats.available_links}
              </span>
            </div>
          </div>

          {/* Last imported file info */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Icon path={mdiFileDocumentOutline} size={0.65} color="#4B5563" />
              <div className="flex-1">
                <span className="text-xs text-gray-600">
                  Last imported file:{' '}
                </span>
                <span className="text-xs font-semibold text-gray-900 font-mono">
                  {lastImportedFile}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({stats.stats.total_links} links, skipped first 200)
                </span>
              </div>
            </div>
          </div>

          {/* Refill commands suggestion */}
          {stats.stats.available_links < AVAILABLE_LINKS_WARNING_THRESHOLD && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Icon
                  path={mdiConsole}
                  size={0.8}
                  color="#2563EB"
                  className="flex-shrink-0 mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    Refill to {AVAILABLE_LINKS_TARGET} Available Links
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    Run these commands to add{' '}
                    {AVAILABLE_LINKS_TARGET - stats.stats.available_links} more
                    links:
                  </p>
                  <div className="bg-gray-900 rounded p-2 font-mono text-xs text-green-400 space-y-1">
                    {Array.from(
                      {
                        length: Math.ceil(
                          (AVAILABLE_LINKS_TARGET -
                            stats.stats.available_links) /
                            100
                        ),
                      },
                      (_, i) => {
                        const fileNum =
                          Math.floor(stats.stats.total_links / 100) + 3 + i;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span>pnpm l 2 prod_{fileNum}.csv</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `pnpm l 2 prod_${fileNum}.csv`
                                );
                              }}
                              className="ml-auto px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-[10px]"
                              title="Copy to clipboard"
                            >
                              Copy
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warning for low available links */}
          {stats.stats.available_links < AVAILABLE_LINKS_WARNING_THRESHOLD && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Icon
                  path={mdiAlertOutline}
                  size={0.8}
                  color="#EA580C"
                  className="flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    Low Available Links
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Only {stats.stats.available_links} claiming links remaining.
                    Consider importing the next file (
                    {`prod_${Math.floor(stats.stats.total_links / 100) + 3}.csv`}
                    ).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Relayer Stats */}
        {relayers && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  Gas Sponsoring Relayers
                </h2>
                {relayers.eth_price_usd && (
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">
                      ETH Price
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${relayers.eth_price_usd.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-4">
                EOA wallets that sponsor gas for USDC transfers on Base
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Relayer */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-100 rounded">
                      <Icon
                        path={mdiCreditCardOutline}
                        size={0.8}
                        color="#9333EA"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Payment Relayer
                      </h3>
                      <a
                        href={`https://basescan.org/address/${relayers.payment.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline font-mono"
                      >
                        {relayers.payment.address.slice(0, 6)}...
                        {relayers.payment.address.slice(-4)}
                      </a>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Balance:</span>
                      <div className="text-right">
                        <span
                          className={`font-semibold font-mono text-xs block ${
                            parseFloat(relayers.payment.balance) < 0.0001
                              ? 'text-red-600'
                              : parseFloat(relayers.payment.balance) < 0.001
                                ? 'text-yellow-600'
                                : 'text-green-600'
                          }`}
                        >
                          {relayers.payment.balance} ETH
                        </span>
                        {relayers.payment.balance_usd && (
                          <span className="text-xs text-gray-500">
                            $
                            {parseFloat(
                              relayers.payment.balance_usd
                            ).toLocaleString()}{' '}
                            USD
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Transactions:
                      </span>
                      <span className="font-semibold text-gray-900">
                        {relayers.payment.transaction_count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Send Relayer */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-indigo-100 rounded">
                      <Icon path={mdiSendOutline} size={0.8} color="#4F46E5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Send Relayer
                      </h3>
                      <a
                        href={`https://basescan.org/address/${relayers.send.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline font-mono"
                      >
                        {relayers.send.address.slice(0, 6)}...
                        {relayers.send.address.slice(-4)}
                      </a>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Balance:</span>
                      <div className="text-right">
                        <span
                          className={`font-semibold font-mono text-xs block ${
                            parseFloat(relayers.send.balance) < 0.0001
                              ? 'text-red-600'
                              : parseFloat(relayers.send.balance) < 0.001
                                ? 'text-yellow-600'
                                : 'text-green-600'
                          }`}
                        >
                          {relayers.send.balance} ETH
                        </span>
                        {relayers.send.balance_usd && (
                          <span className="text-xs text-gray-500">
                            $
                            {parseFloat(
                              relayers.send.balance_usd
                            ).toLocaleString()}{' '}
                            USD
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Transactions:
                      </span>
                      <span className="font-semibold text-gray-900">
                        {relayers.send.transaction_count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning for low balance */}
              {(parseFloat(relayers.payment.balance) < 0.0001 ||
                parseFloat(relayers.send.balance) < 0.0001) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Icon
                      path={mdiAlert}
                      size={0.8}
                      color="#DC2626"
                      className="flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        Critical: Low Balance
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        One or more relayers have critically low balance (&lt;
                        0.0001 ETH). Please refill 0.001 ETH immediately to
                        ensure uninterrupted service.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(parseFloat(relayers.payment.balance) >= 0.0001 &&
                parseFloat(relayers.payment.balance) < 0.001) ||
              (parseFloat(relayers.send.balance) >= 0.0001 &&
                parseFloat(relayers.send.balance) < 0.001) ? (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Icon
                      path={mdiAlertOutline}
                      size={0.8}
                      color="#CA8A04"
                      className="flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">
                        Balance Running Low
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Consider topping up relayer balance to 0.001 ETH to
                        maintain healthy operation.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* Relayer Error */}
        {hasRelayerError && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <Icon path={mdiAlertOutline} size={0.8} color="#CA8A04" />
              <p className="text-sm font-medium">
                Unable to fetch relayer statistics
              </p>
            </div>
          </div>
        )}

        {/* Daily Relayer Transactions Chart */}
        {stats.daily_relayer_transactions &&
          stats.daily_relayer_transactions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Icon path={mdiChartBar} size={0.9} color="#4F46E5" />
                <h2 className="text-xl font-bold text-gray-900">
                  Daily Gas Sponsoring Transactions (≥1 USDC)
                </h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Number of gas-sponsored transactions per day by relayer type (≥1
                USDC only, excluding test transactions, since Nov 16, 2025)
              </p>

              <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.daily_relayer_transactions.filter(
                      (day) => day.date >= '2025-11-16'
                    )}
                    margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        });
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      label={{
                        value: 'Transactions',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 12, fill: '#6b7280' },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      }}
                      formatter={(value: number, name: string) => {
                        const displayName =
                          name === 'payment'
                            ? 'Payment Relayer'
                            : name === 'send'
                              ? 'Send Relayer'
                              : 'Total';
                        return [`${value} tx`, displayName];
                      }}
                    />
                    <Bar
                      dataKey="payment"
                      fill="#9333EA"
                      radius={[4, 4, 0, 0]}
                      stackId="stack"
                    />
                    <Bar
                      dataKey="send"
                      fill="#4F46E5"
                      radius={[4, 4, 0, 0]}
                      stackId="stack"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary stats */}
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Total Days:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {
                        stats.daily_relayer_transactions.filter(
                          (day) => day.date >= '2025-11-16'
                        ).length
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Txs (≥1 USDC):</span>
                    <span className="ml-2 font-semibold text-indigo-600">
                      {stats.daily_relayer_transactions
                        .filter((day) => day.date >= '2025-11-16')
                        .reduce((sum, day) => sum + day.total, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Relayer:</span>
                    <span className="ml-2 font-semibold text-purple-600">
                      {stats.daily_relayer_transactions
                        .filter((day) => day.date >= '2025-11-16')
                        .reduce((sum, day) => sum + day.payment, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Send Relayer:</span>
                    <span className="ml-2 font-semibold text-indigo-600">
                      {stats.daily_relayer_transactions
                        .filter((day) => day.date >= '2025-11-16')
                        .reduce((sum, day) => sum + day.send, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-indigo-200">
                  <p className="text-xs text-gray-600">
                    Total USDC value routed (non-suspicious):{' '}
                    <span className="font-semibold text-gray-700">
                      {totalRegularValue.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{' '}
                      USDC
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Transactions by Address - Only show if we have address data */}
        {regularAddresses.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Icon path={mdiAccountMultiple} size={0.9} color="#9333EA" />
              <h2 className="text-xl font-bold text-gray-900">
                Gas-Sponsored Addresses
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              All addresses with ≤10 sponsored transactions as
              senders/recipients
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">
                      #
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">
                      Address
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Payment
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Send
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Total
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Total Value (USDC)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllRegularAddresses
                    ? regularAddresses
                    : regularAddresses.slice(0, 10)
                  ).map((addr, index) => (
                    <tr
                      key={addr.address}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                      <td className="py-2 px-3">
                        <a
                          href={`https://basescan.org/address/${addr.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline font-mono text-xs"
                        >
                          {addr.address.slice(0, 8)}...
                          {addr.address.slice(-6)}
                        </a>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-purple-600">
                        {addr.payment.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-600">
                        {addr.send.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-900">
                        {addr.total.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-900">
                        {(addr.total_value ?? 0).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-semibold">
                    <td className="py-2 px-3 text-gray-900" colSpan={2}>
                      Total ({showAllRegularAddresses ? 'All' : 'Top 10'})
                    </td>
                    <td className="py-2 px-3 text-right text-purple-600">
                      {(showAllRegularAddresses
                        ? regularAddresses
                        : regularAddresses.slice(0, 10)
                      )
                        .reduce((sum, addr) => sum + addr.payment, 0)
                        .toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-indigo-600">
                      {(showAllRegularAddresses
                        ? regularAddresses
                        : regularAddresses.slice(0, 10)
                      )
                        .reduce((sum, addr) => sum + addr.send, 0)
                        .toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-900">
                      {(showAllRegularAddresses
                        ? regularAddresses
                        : regularAddresses.slice(0, 10)
                      )
                        .reduce((sum, addr) => sum + addr.total, 0)
                        .toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-900">
                      {(showAllRegularAddresses
                        ? regularAddresses
                        : regularAddresses.slice(0, 10)
                      )
                        .reduce((sum, addr) => sum + (addr.total_value ?? 0), 0)
                        .toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {regularAddresses.length > 10 && (
              <div className="mt-4 flex justify-end">
                <button
                  className="text-sm text-indigo-600 hover:underline"
                  onClick={() =>
                    setShowAllRegularAddresses(!showAllRegularAddresses)
                  }
                >
                  {showAllRegularAddresses ? 'Show Top 10' : 'Show All'}
                </button>
              </div>
            )}
          </div>
        )}

        {suspiciousAddresses.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon path={mdiAlertOutline} size={0.9} color="#DC2626" />
              <h2 className="text-xl font-bold text-gray-900">
                Suspicious Addresses (&gt;10 Sponsored Transactions)
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Addresses excluded from the main totals due to unusually high
              activity as either sender or recipient.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">
                      #
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900">
                      Address
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Payment
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Send
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Total
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900">
                      Total Value (USDC)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {suspiciousAddresses.map((addr, index) => (
                    <tr
                      key={addr.address}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                      <td className="py-2 px-3">
                        <a
                          href={`https://basescan.org/address/${addr.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:underline font-mono text-xs"
                        >
                          {addr.address.slice(0, 8)}...
                          {addr.address.slice(-6)}
                        </a>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-purple-600">
                        {addr.payment.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-600">
                        {addr.send.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-900">
                        {addr.total.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-gray-900">
                        {(addr.total_value ?? 0).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

