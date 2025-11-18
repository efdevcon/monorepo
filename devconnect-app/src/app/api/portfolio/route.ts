import { NextRequest, NextResponse } from 'next/server';
import { chains, convertNetworkToChainId } from '@/config/networks';
import { ENTRYPOINT_ADDRESS } from '@/config/config';
import { createServerClient } from '../auth/supabaseServerClient';
import peanut from '@squirrel-labs/peanut-sdk';
import { PAYMENT_RELAYER, SEND_RELAYER } from '@/config/config';

const ZAPPER_API_KEY = process.env.ZAPPER_API_KEY;

const SPECIFIC_NFT_CONTRACT = '0xD6A7dCDEe200Fa37F149323C0aD6b3698Aa0E829';
const BASE_CHAIN_ID = 8453;


export async function POST(request: NextRequest) {
  try {
    const { address, email } = await request.json();
    
    console.log('Portfolio API called for address:', address, email ? `by user: ${email}` : '(unauthenticated)');

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
      query PortfolioV2Query($addresses: [Address!]!, $chainIds: [Int!], $nftFilters: PortfolioV2NftBalanceByTokenFiltersInput) {
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
            byToken(first: 100, filters: $nftFilters) {
              edges {
                node {
                  token {
                    tokenId
                    name
                    collection {
                      address
                      network
                    }
                  }
                }
              }
            }
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
          nftFilters: {
            collections: [{
              address: SPECIFIC_NFT_CONTRACT,
              chainId: BASE_CHAIN_ID
            }]
          },
        },
      }),
    });

    const portfolioResult = await portfolioResponse.json();

    if (portfolioResult.errors) {
      console.error('Zapper portfolio API error:', portfolioResult.errors);
      return NextResponse.json(
        { 
          error: portfolioResult.errors[0]?.message || 'Failed to fetch portfolio data',
          errorType: 'ZAPPER_API_ERROR',
          address: address,
        },
        { status: 500 }
      );
    }

    console.log('Portfolio data fetched successfully');

    // Process portfolio data
    const portfolio = portfolioResult.data.portfolioV2;

    // Extract worldfair.eth domain name from NFT collection
    const nftTokenEdges = portfolio.nftBalances?.byToken?.edges || [];
    let worldfairDomain: string | null = null;
    
    if (nftTokenEdges.length > 0) {
      // Look through all NFT tokens
      for (const tokenEdge of nftTokenEdges) {
        const token = tokenEdge.node?.token;
        const name = token?.name || '';
        
        // Look for worldfair.eth in the NFT name
        if (name.endsWith('.worldfair.eth')) {
          worldfairDomain = name;
          console.log(`✅ [Portfolio] Found worldfair.eth domain from NFT:`, {
            domain: worldfairDomain,
            tokenId: token?.tokenId,
            collection: token?.collection?.address,
          });
          break;
        }
      }
      
      if (worldfairDomain) {
        console.log(`✅ [Portfolio] Address ${address} owns worldfair.eth NFT: ${worldfairDomain}`);
      } else {
        console.log(`ℹ️ [Portfolio] Address ${address} has ${nftTokenEdges.length} NFT(s) from worldfair contract but none have .worldfair.eth name`);
      }
    }

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

    // Helper function to get actual sender/receiver from Alchemy for sponsored transactions
    const getTransactionDetails = async (txHash: string, chainId: number) => {
      try {
        // Only fetch for Base chain (8453) where our relayers operate
        if (chainId !== 8453) return null;

        const rpcUrl = process.env.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionByHash',
            params: [txHash],
          }),
        });

        const data = await response.json();
        
        if (data.result && data.result.input) {
          const input = data.result.input;

          // Parse USDC transfer data from transaction input
          // transfer(address,uint256) = 0xa9059cbb
          // transferFrom(address,address,uint256) = 0x23b872dd
          // receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32) = 0xe3ee160e

          if (input.startsWith('0xa9059cbb')) {
            // transfer(address to, uint256 amount)
            const toAddress = '0x' + input.slice(34, 74);
            return {
              from: data.result.from.toLowerCase(),
              to: toAddress.toLowerCase(),
            };
          } else if (input.startsWith('0x23b872dd')) {
            // transferFrom(address from, address to, uint256 amount)
            const fromAddress = '0x' + input.slice(34, 74);
            const toAddress = '0x' + input.slice(74, 114);
            return {
              from: fromAddress.toLowerCase(),
              to: toAddress.toLowerCase(),
            };
          } else if (input.startsWith('0xe3ee160e')) {
            // receiveWithAuthorization(address from, address to, uint256 value, ...)
            // NOTE: Despite the name "receive", the first param is the sender (from) and second is receiver (to)
            // Each parameter is 32 bytes (64 hex chars), addresses are right-aligned
            // First param (from/sender): starts at position 10, is 64 hex chars, address is last 40
            // Second param (to/receiver): starts at position 74, is 64 hex chars, address is last 40
            
            const fromAddressParam = input.slice(10, 74); // 64 chars - first param (sender)
            const toAddressParam = input.slice(74, 138); // 64 chars - second param (receiver)
            
            // Extract last 40 chars (20 bytes) as the actual address
            const fromAddress = '0x' + fromAddressParam.slice(-40);
            const toAddress = '0x' + toAddressParam.slice(-40);
            
            return {
              from: fromAddress.toLowerCase(),
              to: toAddress.toLowerCase(),
            };
          }
        }
        return null;
      } catch (error) {
        console.error('Error fetching transaction details from Alchemy:', error);
        return null;
      }
    };

    // Process the transaction data to create descriptions and apply the "Received" to "Sent" replacement
    if (activityResult.data?.transactionHistoryV2?.edges) {
      // Use for...of to support async operations
      for (const edge of activityResult.data.transactionHistoryV2.edges) {
        const node = edge.node;

        // Create description from the transaction data using fungibleDeltas (if available)
        if (node.fungibleDeltas && node.fungibleDeltas.length > 0) {
          const tokenInfo = node.fungibleDeltas[0];
          const symbol = tokenInfo.token?.symbol || 'Unknown Token';
          const amount = Math.abs(tokenInfo.amount);

          // Check if this is a sponsored transaction (from payment or send relayer)
          const isFromSendRelayer = node.from?.address?.toLowerCase() === SEND_RELAYER.toLowerCase();
          const isFromPaymentRelayer = node.from?.address?.toLowerCase() === PAYMENT_RELAYER.toLowerCase();
          const isUserSubject = node.subject?.toLowerCase() === address.toLowerCase();
          const isUserSender = node.from?.address?.toLowerCase() === address.toLowerCase();

          if (isFromSendRelayer && isUserSubject) {
            // This is a SEND RELAYER sponsored transaction - need to check actual tx data from Alchemy
            const hash = node.transactionHash || node.transaction?.hash;
            const networkValue = node.transaction?.network || node.networkObject?.chainId || node.network;
            const chainId = convertNetworkToChainId(networkValue);

            const txDetails = await getTransactionDetails(hash, chainId);

            if (txDetails) {
              // Use Alchemy data to determine actual sender/receiver
              const userAddress = address.toLowerCase();
              const isActualSender = txDetails.from === userAddress;
              const isActualReceiver = txDetails.to === userAddress;

              if (isActualSender) {
                node.interpretation = {
                  processedDescription: `Sent ${amount.toFixed(4)} ${symbol}`
                };
              } else if (isActualReceiver) {
                node.interpretation = {
                  processedDescription: `Received ${amount.toFixed(4)} ${symbol}`
                };
              } else {
                // Fallback if user is neither sender nor receiver
                node.interpretation = {
                  processedDescription: `${amount.toFixed(4)} ${symbol}`
                };
              }
            } else {
              // Fallback if we can't get Alchemy data
              node.interpretation = {
                processedDescription: `${amount.toFixed(4)} ${symbol}`
              };
            }
          } else if (isFromPaymentRelayer && isUserSubject) {
            // Payment relayer - user is receiving a payment
            node.interpretation = {
              processedDescription: `Sent ${amount.toFixed(4)} ${symbol}`
            };
          } else if (isUserSender) {
            // User sent directly (not sponsored)
            node.interpretation = {
              processedDescription: `Sent ${amount.toFixed(4)} ${symbol}`
            };
          } else {
            // User received
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
      }
    }
    // console.log('Processed edges:', activityResult.data?.transactionHistoryV2?.edges);

    if (activityResult.errors) {
      console.error('Zapper activity API error:', activityResult.errors);
      // Continue without activity data if there's an error
      console.log('Continuing without activity data due to API error');
    } else {
      console.log('Activity data fetched successfully');
    }

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
    // Check for peanut claiming link associated with this user (optional, requires auth)
    // This allows the frontend to show claiming status in the wallet UI
    // Email is provided by frontend if user is authenticated
    // ============================================
    let peanutClaimingState = null;
    
    if (email) {
      try {
        const supabase = createServerClient();

        console.log('Portfolio request from authenticated user:', email);

        // Query for claiming link by user email directly
        const { data: claimingLink, error: claimError } = await supabase
          .from('devconnect_app_claiming_links')
          .select('*')
          .eq('claimed_by_user_email', email)
          .maybeSingle();

        if (claimError) {
          console.error('Error checking peanut claiming link:', claimError);
        } else if (claimingLink) {
          console.log('Found claiming link for user:', email);

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
              userEmail: email,
              peanut_claimed: linkDetails.claimed,
              tx_hash: txHash,
              db_claimed: !!claimingLink.claimed_by_user_email,
            });
          } catch (peanutError) {
            console.error('Error fetching peanut link details:', peanutError);
            // Still return database info even if peanut check fails
            peanutClaimingState = {
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
          console.log('No claiming link found for user:', email);
        }
      } catch (supabaseError) {
        console.error('Error accessing Supabase for peanut check:', supabaseError);
      }
    }

    return NextResponse.json({
      totalValue,
      tokenBalances: filteredTokenBalances,
      recentActivity,
      peanutClaimingState,
      worldfairDomain,
    });

  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        errorType: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
} 

