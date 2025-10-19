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
    toast.success('🎉 FAKE POAP Verification Successful!', {
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
 * @returns Promise<boolean> - True if ticket is associated
 */
export async function isTicketAssociated(questId: string, conditionValues: string): Promise<boolean> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.error('localStorage is not available');
      return false;
    }

    // Get tickets from local storage
    const ticketsJson = localStorage.getItem('user-tickets');

    if (!ticketsJson) {
      toast.warning('🎫 No Tickets Found', {
        description: 'Please connect a ticket to your account first.',
        duration: 5000,
      });
      return false;
    }

    // Parse the tickets data
    const orders = JSON.parse(ticketsJson);

    // Check if there's at least one ticket
    let totalTickets = 0;
    if (Array.isArray(orders)) {
      for (const order of orders) {
        if (order.tickets && Array.isArray(order.tickets)) {
          totalTickets += order.tickets.length;
        }
      }
    }

    if (totalTickets > 0) {
      toast.success('✅ Ticket Verified!', {
        description: `You have ${totalTickets} ticket${totalTickets > 1 ? 's' : ''} associated with your account.`,
        duration: 5000,
      });
      return true;
    } else {
      toast.warning('🎫 No Tickets Found', {
        description: 'Please connect a ticket to your account first.',
        duration: 5000,
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
  toast.success('🎉 Link Visited!', {
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
 * Verify if the user has the required balance
 * @param questId - The ID of the quest
 * @param conditionValues - Balance verification requirements
 * @returns Promise<boolean> - True if balance requirement is met
 */
export async function verifyBalance(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement balance verification logic
  toast.info('🔧 Coming Soon', {
    description: `Verifying balance with values: ${conditionValues}`,
    duration: 3000,
  });
  return true;
}

/**
 * Generic quest action handler that routes to the appropriate function based on condition type
 * @param questId - The ID of the quest
 * @param conditionType - The type of condition to check
 * @param conditionValues - Values for the condition check
 * @param userAddresses - Optional array of user addresses for POAP verification
 * @returns Promise<boolean> - True if the condition is met
 */
export async function executeQuestAction(
  questId: string,
  conditionType: QuestConditionType,
  conditionValues: string,
  userAddresses?: string[]
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
      return isTicketAssociated(questId, conditionValues);
    case 'isProfileSetup':
      return isProfileSetup(questId, conditionValues);
    case 'isLinkVisited':
      return isLinkVisited(questId, conditionValues);
    case 'isMiniQuizCompleted':
      return isMiniQuizCompleted(questId, conditionValues);
    case 'verifyBalance':
      return verifyBalance(questId, conditionValues);
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
