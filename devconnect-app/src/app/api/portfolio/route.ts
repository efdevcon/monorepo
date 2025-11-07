import { NextRequest, NextResponse } from 'next/server';
import { chains, convertNetworkToChainId } from '@/config/networks';
import { ENTRYPOINT_ADDRESS } from '@/config/config';
import { createServerClient } from '../auth/supabaseServerClient';
import peanut from '@squirrel-labs/peanut-sdk';

const ZAPPER_API_KEY = process.env.ZAPPER_API_KEY;


export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    
    console.log('Portfolio API called for address:', address);

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!ZAPPER_API_KEY) {
      return NextResponse.json(
        { error: 'Zapper API key not configured' },
        { status: 500 }
      );
    }

    // Get all chain IDs from the chains configuration
    const chainIds = chains.map(chain => chain.id);

    const headers = {
      'Content-Type': 'application/json',
      'x-zapper-api-key': ZAPPER_API_KEY,
    };

    // Fetch portfolio data
    const portfolioQuery = `
      query PortfolioV2Query($addresses: [Address!]!, $chainIds: [Int!]) {
        portfolioV2(addresses: $addresses, chainIds: $chainIds) {
          tokenBalances {
            totalBalanceUSD
            byToken(first: 10) {
              edges {
                node {
                  tokenAddress
                  symbol
                  balance
                  balanceUSD
                  imgUrlV2
                  network {
                    chainId
                  }
                }
              }
            }
          }
          appBalances {
            totalBalanceUSD
          }
          nftBalances {
            totalBalanceUSD
          }
        }
      }
    `;

    const portfolioResponse = await fetch('https://public.zapper.xyz/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: portfolioQuery,
        variables: {
          addresses: [address],
          chainIds: chainIds,
        },
      }),
    });

    const portfolioResult = await portfolioResponse.json();

    if (portfolioResult.errors) {
      console.error('Zapper portfolio API error:', portfolioResult.errors);
      return NextResponse.json(
        { error: portfolioResult.errors[0]?.message || 'Failed to fetch portfolio data' },
        { status: 500 }
      );
    }

    console.log('Portfolio data fetched successfully');

    // Fetch activity data for all chains
    const activityQuery = `
      query TransactionDescriptionExample($subjects: [Address!]!, $perspective: TransactionHistoryV2Perspective, $first: Int, $filters: TransactionHistoryV2FiltersArgs) {
        transactionHistoryV2(subjects: $subjects, perspective: $perspective, first: $first, filters: $filters) {
          edges {
            node {
              ... on TimelineEventV2 {
                interpretation {
                  processedDescription
                  description
                }
                transaction {
                  hash
                  timestamp
                  network
                }
              }
              ... on ActivityTimelineEventDelta {
                transactionHash
                transactionBlockTimestamp
                network
                subject
                from {
                  address
                  isContract
                }
                to {
                  address
                  isContract
                }
                fungibleCount
                fungibleDeltas {
                  amount
                  amountRaw
                  token {
                    address
                    decimals
                    symbol
                    name
                    imageUrlV2
                  }
                }
                networkObject {
                  chainId
                }
              }
            }
          }
        }
      }
    `;

    const activityResponse = await fetch('https://public.zapper.xyz/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: activityQuery,
        variables: {
          subjects: [address],
          perspective: 'All',
          first: 20,
          filters: {
            chainIds: chainIds
          }
        },
      }),
    });

    const activityResult = await activityResponse.json();


    // Process the transaction data to create descriptions and apply the "Received" to "Sent" replacement
    if (activityResult.data?.transactionHistoryV2?.edges) {
      activityResult.data.transactionHistoryV2.edges.forEach((edge: any) => {
        const node = edge.node;

        // Create description from the transaction data using fungibleDeltas (if available)
        if (node.fungibleDeltas && node.fungibleDeltas.length > 0) {
          const tokenInfo = node.fungibleDeltas[0];
          const symbol = tokenInfo.token?.symbol || 'Unknown Token';
          const amount = Math.abs(tokenInfo.amount);

          // Check if this is a sponsored transaction (to EntryPoint)
          if (node.subject?.toLowerCase() === address.toLowerCase() && node.to?.address?.toLowerCase() === ENTRYPOINT_ADDRESS.toLowerCase()) {
            // This is a sponsored send transaction
            node.interpretation = {
              processedDescription: `Sent ${amount.toFixed(4)} ${symbol}`
            };
          } else if (node.from?.address?.toLowerCase() === address.toLowerCase()) {
            node.interpretation = {
              processedDescription: `Sent ${amount.toFixed(4)} ${symbol}`
            };
          } else {
            node.interpretation = {
              processedDescription: `Received ${amount.toFixed(4)} ${symbol}`
            };
          }
        }

        // Process ALL activities to convert network names to chainId
        // Get chainId from various sources and ensure it's a number
        const networkValue = node.transaction?.network || node.networkObject?.chainId || node.network;
        const chainId = convertNetworkToChainId(networkValue);

        // Handle both TimelineEventV2 and ActivityTimelineEventDelta formats
        const hash = node.transaction?.hash || node.transactionHash;
        const timestamp = node.transaction?.timestamp || node.transactionBlockTimestamp;

        // Create minimal transaction object with only essential data
        node.transaction = {
          hash: hash,
          timestamp: timestamp,
          chainId: chainId
        };

        // Clean up the node to only return minimal info to frontend
        const cleanedNode = {
          interpretation: node.interpretation,
          transaction: node.transaction
        };

        // Replace the original node with cleaned version
        edge.node = cleanedNode;
      });
    }
    // console.log('Processed edges:', activityResult.data?.transactionHistoryV2?.edges);

    if (activityResult.errors) {
      console.error('Zapper activity API error:', activityResult.errors);
      // Continue without activity data if there's an error
      console.log('Continuing without activity data due to API error');
    } else {
      console.log('Activity data fetched successfully');
    }

    // Process portfolio data
    const portfolio = portfolioResult.data.portfolioV2;
    
    // Filter tokens with value >= $0.01 and calculate total from tokens only
    const allTokenBalances = portfolio.tokenBalances?.byToken?.edges?.map((edge: any) => {
      const token = edge.node;


      // Flatten the token structure with chainId directly
      const flattenedToken = {
        tokenAddress: token.tokenAddress,
        symbol: token.symbol,
        balance: token.balance,
        balanceUSD: token.balanceUSD,
        imgUrlV2: token.imgUrlV2,
        chainId: token.network?.chainId || convertNetworkToChainId(token.network?.name || 'ethereum')
      };

      return flattenedToken;
    }) || [];
    const filteredTokenBalances = allTokenBalances.filter((token: any) => token.balanceUSD >= 0.01);
    
    const totalValue = filteredTokenBalances.reduce((sum: number, token: any) => sum + token.balanceUSD, 0);
    
    console.log(`Filtered ${filteredTokenBalances.length} tokens (${allTokenBalances.length} total, ${allTokenBalances.length - filteredTokenBalances.length} below $0.01)`);
    console.log(`Total value: $${totalValue.toFixed(2)}`);

    // Process activity data
    const recentActivity = activityResult.data?.transactionHistoryV2?.edges?.map((edge: any) => edge.node) || [];

    // ============================================
    // Check for peanut claiming link associated with this address
    // This allows the frontend to show claiming status in the wallet UI
    // ============================================
    let peanutClaimingState = null;
    try {
      const supabase = createServerClient();

      // Query for claiming link by address
      const { data: claimingLink, error: claimError } = await supabase
        .from('devconnect_app_claiming_links')
        .select('*')
        .eq('claimed_by_address', address.toLowerCase())
        .maybeSingle();

      if (claimError) {
        console.error('Error checking peanut claiming link:', claimError);
      } else if (claimingLink) {
        console.log('Found claiming link for address:', address);

        // Check the actual claim status on Peanut protocol
        try {
          const linkDetails = await peanut.getLinkDetails({
            link: claimingLink.link,
          });

          // Try to get transaction hash from Peanut API if claimed
          let txHash = null;
          if (linkDetails.claimed && linkDetails.rawOnchainDepositInfo) {
            try {
              const pubKey20 = (linkDetails.rawOnchainDepositInfo as any).pubKey20;
              if (pubKey20) {
                const apiUrl = `https://api.peanut.me/send-links/${pubKey20}?c=${linkDetails.chainId}&v=${linkDetails.contractVersion}&i=${linkDetails.depositIndex}`;
                const apiResponse = await fetch(apiUrl);
                if (apiResponse.ok) {
                  const apiData = await apiResponse.json();
                  txHash = apiData.claim?.txHash || null;
                }
              }
            } catch (apiError) {
              console.error('Error fetching transaction hash from Peanut API:', apiError);
            }
          }

          peanutClaimingState = {
            link: claimingLink.link,
            amount: claimingLink.amount,
            claimed_date: claimingLink.claimed_date,
            ticket_secret_proof: claimingLink.ticket_secret_proof,
            // Peanut protocol claim status (actual blockchain state)
            peanut_claimed: linkDetails.claimed,
            // Transaction hash from Peanut API
            tx_hash: txHash,
            // Database claim status
            db_claimed_by_address: claimingLink.claimed_by_address,
            db_claimed_by_user_email: claimingLink.claimed_by_user_email,
          };

          console.log('Peanut claiming state:', {
            address,
            peanut_claimed: linkDetails.claimed,
            tx_hash: txHash,
            db_claimed: !!claimingLink.claimed_by_address,
          });
        } catch (peanutError) {
          console.error('Error fetching peanut link details:', peanutError);
          // Still return database info even if peanut check fails
          peanutClaimingState = {
            link: claimingLink.link,
            amount: claimingLink.amount,
            claimed_date: claimingLink.claimed_date,
            ticket_secret_proof: claimingLink.ticket_secret_proof,
            peanut_claimed: null, // Unknown state
            tx_hash: null,
            db_claimed_by_address: claimingLink.claimed_by_address,
            db_claimed_by_user_email: claimingLink.claimed_by_user_email,
            error: 'Failed to check Peanut protocol status',
          };
        }
      } else {
        console.log('No claiming link found for address:', address);
      }
    } catch (supabaseError) {
      console.error('Error accessing Supabase for peanut check:', supabaseError);
    }

    return NextResponse.json({
      totalValue,
      tokenBalances: filteredTokenBalances,
      recentActivity,
      peanutClaimingState,
    });

  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
