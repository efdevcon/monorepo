import type { QuestConditionType } from '@/types/quest';
import { toast } from 'sonner';

/**
 * Quest action functions for each QuestConditionType
 * These functions handle the verification logic for quest completion
 */

/**
 * Verify if the user has a valid basename
 * @param questId - The ID of the quest
 * @param conditionValues - Additional values for the condition check
 * @returns Promise<boolean> - True if basename is verified
 */
export async function verifyBasename(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement basename verification logic
  toast.info('🔧 Coming Soon', {
    description: 'Basename verification is not yet implemented.',
    duration: 3000,
  });
  return true;
}

/**
 * Check if the user has made the required number of crypto payments
 * @param questId - The ID of the quest
 * @param conditionValues - Number of payments required
 * @returns Promise<boolean> - True if payment count is met
 */
export async function numberOfCryptoPayment(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement crypto payment verification logic
  toast.info('🔧 Coming Soon', {
    description: 'Crypto payment verification is not yet implemented.',
    duration: 3000,
  });
  return true;
}

/**
 * Verify if the user has claimed their POAP
 * @param questId - The ID of the quest
 * @param conditionValues - POAP drop ID to verify
 * @param userAddresses - Array of user addresses to check
 * @returns Promise<{completed: boolean, mintedOn?: number}> - Verification result with minting date (Unix timestamp)
 */
export async function verifyPoap(
  questId: string,
  conditionValues: string,
  userAddresses?: string[]
): Promise<{ completed: boolean; mintedOn?: number }> {
  try {
    if (!userAddresses || userAddresses.length === 0) {
      toast.info('⚠️ No Addresses', {
        description: 'No user addresses provided for POAP verification',
        duration: 3000,
      });
      return { completed: false };
    }

    if (!conditionValues) {
      toast.info('⚠️ Missing Drop ID', {
        description: 'No POAP drop ID provided for verification',
        duration: 3000,
      });
      return { completed: false };
    }

    // Call the API endpoint to check POAP ownership
    const response = await fetch('/api/poap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: userAddresses,
        dropId: conditionValues,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `POAP API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      console.error('POAP API error:', data.error);
      return { completed: false };
    }

    const hasPoap = data.hasPoap;
    const mintedOn = data.mintedOn; // Unix timestamp from POAP API

    // TETMP: return fake data for testing (unix timestamp)
    toast.success('POAP Verification Successful! 🎉', {
      description: 'Congratulations! You have completed this quest!',
      duration: 6000,
    });
    return { completed: true, mintedOn: Math.floor(Date.now() / 1000) };

    if (hasPoap) {
      console.log(
        `✅ POAP verification successful for quest ${questId} with drop ID ${conditionValues}`
      );
      if (mintedOn) {
        console.log(`POAP was minted on: ${mintedOn} (Unix timestamp)`);
      }

      // Store the POAP minting metadata in local storage for the stampbook
      if (
        typeof window !== 'undefined' &&
        typeof localStorage !== 'undefined' &&
        mintedOn
      ) {
        try {
          const poapMetadata = JSON.parse(
            localStorage.getItem('poap-metadata') || '{}'
          );
          poapMetadata[questId] = {
            dropId: conditionValues,
            mintedOn: mintedOn, // Store as Unix timestamp
            verifiedAt: new Date().toISOString(),
          };
          localStorage.setItem('poap-metadata', JSON.stringify(poapMetadata));
        } catch (e) {
          console.error('Error storing POAP metadata:', e);
        }
      }

      // Show success feedback to user
      toast.success('🎉 POAP Verified!', {
        description: 'Congratulations! You have completed this quest!',
        duration: 6000,
      });

      return { completed: true, mintedOn };
    } else {
      console.log(
        `❌ POAP verification failed for quest ${questId} with drop ID ${conditionValues}`
      );
      // Show helpful feedback to user
      toast.warning('🔍 POAP Not Found', {
        description: `You don't currently own the required POAP (ID: ${conditionValues}). Visit the quest location to claim it.`,
        duration: 6000,
      });
      return { completed: false };
    }
  } catch (error) {
    console.error(`Error verifying POAP for quest ${questId}:`, error);
    // Show error feedback to user
    toast.error('⚠️ Verification Error', {
      description:
        'Unable to verify POAP ownership at this time. Please try again later.',
      duration: 5000,
    });
    return { completed: false };
  }
}

/**
 * Check if the user's wallet is connected
 * @param questId - The ID of the quest
 * @param conditionValues - Wallet connection requirements
 * @returns Promise<boolean> - True if wallet is connected
 */
export async function isWalletConnected(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement wallet connection check logic
  toast.info('🔧 Coming Soon', {
    description: `Checking wallet connection with values: ${conditionValues}`,
    duration: 3000,
  });
  return true;
}

/**
 * Check if the user's ticket is associated with their account
 * @param questId - The ID of the quest
 * @param conditionValues - Ticket association requirements
 * @param tickets - Optional array of ticket orders from useTickets hook
 * @returns Promise<boolean> - True if ticket is associated
 */
export async function isTicketAssociated(
  questId: string,
  conditionValues: string,
  tickets?: any[]
): Promise<boolean> {
  try {
    let ticketsToCheck = tickets;

    // Fallback to localStorage if tickets not provided
    if (!ticketsToCheck) {
      console.log('📋 No tickets provided, reading from localStorage');
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.error('localStorage is not available');
        return false;
      }

      // Get tickets from Zustand persisted store
      const storeJson = localStorage.getItem('devconnect-store');

      if (!storeJson) {
        toast.warning('🎫 No Tickets Found', {
          description: 'Please connect a ticket to your account first in the ticket tab.',
          action: {
            label: 'Go to Tickets',
            onClick: () => {
              if (typeof window !== 'undefined') {
                window.location.href = '/tickets';
              }
            },
          },
          duration: 10000,
        });
        return false;
      }

      // Parse the persisted store data (only main tickets, not sideTickets)
      const store = JSON.parse(storeJson);
      ticketsToCheck = store.state?.tickets || [];
    } else {
      console.log('🎟️ Tickets provided from useTickets hook');
    }

    console.log('🎫 Ticket data:', {
      totalOrders: ticketsToCheck?.length || 0,
      orders: ticketsToCheck,
    });

    // Check if there's at least one ticket (only counting main tickets)
    let totalTickets = 0;
    if (Array.isArray(ticketsToCheck)) {
      for (const order of ticketsToCheck) {
        if (order.tickets && Array.isArray(order.tickets)) {
          const orderTicketCount = order.tickets.length;
          totalTickets += orderTicketCount;
          console.log(`  Order ${order.orderCode || 'N/A'}: ${orderTicketCount} ticket(s)`);
        }
      }
    }

    console.log(`✅ Total tickets found: ${totalTickets}`);

    if (totalTickets > 0) {
      toast.success('✅ Ticket Verified!', {
        description: `You have ${totalTickets} ticket${totalTickets > 1 ? 's' : ''} associated with your account.`,
        duration: 5000,
      });
      return true;
    } else {
      toast.warning('🎫 No Tickets Found', {
        description: 'Please connect a ticket to your account first in the ticket tab.',
        action: {
          label: 'Go to Tickets',
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.location.href = '/tickets';
            }
          },
        },
        duration: 10000,
      });
      return false;
    }
  } catch (error) {
    console.error(`Error checking ticket association for quest ${questId}:`, error);
    toast.error('⚠️ Verification Error', {
      description: 'Unable to verify ticket association at this time.',
      duration: 5000,
    });
    return false;
  }
}

/**
 * Check if the user's profile is properly set up
 * @param questId - The ID of the quest
 * @param conditionValues - Profile setup requirements
 * @returns Promise<boolean> - True if profile is set up
 */
export async function isProfileSetup(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement profile setup check logic
  toast.info('🔧 Coming Soon', {
    description: `Checking profile setup with values: ${conditionValues}`,
    duration: 3000,
  });
  return true;
}

/**
 * Check if the user has visited the required link
 * @param questId - The ID of the quest
 * @param conditionValues - Link visit requirements
 * @returns Promise<boolean> - True if link has been visited
 */
export async function isLinkVisited(questId: string, conditionValues: string): Promise<boolean> {
  toast.success('🎉 Quest Completed!', {
    description: 'Congratulations! You have completed this quest!',
    duration: 6000,
  });
  return true;
}

/**
 * Check if the user has completed the mini quiz
 * @param questId - The ID of the quest
 * @param conditionValues - Quiz completion requirements
 * @returns Promise<boolean> - True if quiz is completed
 */
export async function isMiniQuizCompleted(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement mini quiz completion check logic
  toast.info('🔧 Coming Soon', {
    description: `Checking mini quiz completion with values: ${conditionValues}`,
    duration: 3000,
  });
  return true;
}

/**
 * Verify if the user has the required balance (checks if Peanut perk has been claimed)
 * @param questId - The ID of the quest
 * @param conditionValues - Balance verification requirements (not used currently)
 * @param userAddresses - Array of connected wallet addresses to check
 * @returns Promise<boolean> - True if Peanut perk has been claimed in any connected address
 */
export async function verifyBalance(
  questId: string,
  conditionValues: string,
  userAddresses?: string[]
): Promise<boolean> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.error('localStorage is not available');
      return false;
    }

    // Check if addresses are provided
    if (!userAddresses || userAddresses.length === 0) {
      toast.warning('🥜 Connect Wallet', {
        description: 'Please connect a wallet to verify this quest.',
        duration: 5000,
      });
      return false;
    }

    console.log('🥜 [verifyBalance] User addresses:', userAddresses);

    // Get portfolio data from localStorage cache (key: 'portfolio')
    const portfolioCacheJson = localStorage.getItem('portfolio');

    if (!portfolioCacheJson) {
      toast.warning('🥜 Claim Your Perk', {
        description: 'Claim your $2 USDC in the Wallet tab to complete this quest.',
        action: {
          label: 'Go to Wallet',
          onClick: () => {
            window.location.href = '/wallet';
          },
        },
        duration: 10000,
      });
      return false;
    }

    try {
      const portfolioCache = JSON.parse(portfolioCacheJson);

      // Check all connected addresses for peanut claiming state
      for (const address of userAddresses) {
        const addressKey = address.toLowerCase();
        const portfolio = portfolioCache[addressKey];

        if (portfolio?.peanutClaimingState) {
          console.log('🥜 [verifyBalance] Checking peanut claiming state for:', {
            address: address.slice(0, 10) + '...',
            peanut_claimed: portfolio.peanutClaimingState.peanut_claimed,
            db_claimed: portfolio.peanutClaimingState.db_claimed,
          });

          // If any connected address has claimed the peanut, return true
          if (portfolio.peanutClaimingState.peanut_claimed === true) {
            toast.success('✅ Peanut Claimed!', {
              description: 'You have successfully claimed your $2 USDC perk.',
              duration: 5000,
            });
            return true;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing portfolio cache:', e);
    }

    // If not claimed in any connected address, show message to claim
    toast.warning('🥜 Claim Your Perk', {
      description: 'Claim your $2 USDC in the Wallet tab to complete this quest.',
      action: {
        label: 'Go to Wallet',
        onClick: () => {
          window.location.href = '/wallet';
        },
      },
      duration: 10000,
    });
    return false;
  } catch (error) {
    console.error(`Error verifying balance for quest ${questId}:`, error);
    toast.error('⚠️ Verification Error', {
      description: 'Unable to verify perk claim status at this time.',
      duration: 5000,
    });
    return false;
  }
}

/**
 * Generic quest action handler that routes to the appropriate function based on condition type
 * @param questId - The ID of the quest
 * @param conditionType - The type of condition to check
 * @param conditionValues - Values for the condition check
 * @param userAddresses - Optional array of user addresses for POAP verification and balance checks
 * @param tickets - Optional array of ticket orders from useTickets hook
 * @returns Promise<boolean> - True if the condition is met
 */
export async function executeQuestAction(
  questId: string,
  conditionType: QuestConditionType,
  conditionValues: string,
  userAddresses?: string[],
  tickets?: any[]
): Promise<boolean> {
  switch (conditionType) {
    case 'verifyBasename':
      return verifyBasename(questId, conditionValues);
    case 'numberOfCryptoPayment':
      return numberOfCryptoPayment(questId, conditionValues);
    case 'verifyPoap': {
      // verifyPoap returns an object, extract the completed boolean
      const result = await verifyPoap(questId, conditionValues, userAddresses);
      return result.completed;
    }
    case 'isWalletConnected':
      return isWalletConnected(questId, conditionValues);
    case 'isTicketAssociated':
      return isTicketAssociated(questId, conditionValues, tickets);
    case 'isProfileSetup':
      return isProfileSetup(questId, conditionValues);
    case 'isLinkVisited':
      return isLinkVisited(questId, conditionValues);
    case 'isMiniQuizCompleted':
      return isMiniQuizCompleted(questId, conditionValues);
    case 'verifyBalance':
      return verifyBalance(questId, conditionValues, userAddresses);
    case '':
      // Default case for empty condition type
      toast.info('🔧 No Action Required', {
        description: 'This quest has no specific verification requirements.',
        duration: 3000,
      });
      return true;
    default:
      toast.warning('⚠️ Unknown Quest Type', {
        description: `Quest type "${conditionType}" is not yet supported.`,
        duration: 4000,
      });
      return false;
  }
}

/**
 * Type-safe quest action function map
 */
export const questActions = {
  verifyBasename,
  numberOfCryptoPayment,
  verifyPoap,
  isWalletConnected,
  isTicketAssociated,
  isProfileSetup,
  isLinkVisited,
  isMiniQuizCompleted,
  verifyBalance,
} as const;
