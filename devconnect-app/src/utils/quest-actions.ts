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
 * @returns Promise<boolean> - True if POAP is verified
 */
export async function verifyPoap(questId: string, conditionValues: string, userAddresses?: string[]): Promise<boolean> {
  try {
    if (!userAddresses || userAddresses.length === 0) {
      console.warn('No user addresses provided for POAP verification');
      return false;
    }

    if (!conditionValues) {
      console.warn('No POAP drop ID provided for verification');
      return false;
    }

    // Call the API endpoint to check POAP ownership
    const response = await fetch('/api/poap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addresses: userAddresses,
        dropId: conditionValues
      })
    });

    if (!response.ok) {
      throw new Error(`POAP API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('POAP API error:', data.error);
      return false;
    }

    const hasPoap = data.hasPoap;

    if (hasPoap) {
      console.log(`✅ POAP verification successful for quest ${questId} with drop ID ${conditionValues}`);
      // Show success feedback to user
      toast.success('🎉 POAP Verified!', {
        description: 'Congratulations! You have completed this quest!',
        duration: 6000,
      });
    } else {
      console.log(`❌ POAP verification failed for quest ${questId} with drop ID ${conditionValues}`);
      // Show helpful feedback to user
      toast.warning('🔍 POAP Not Found', {
        description: `You don't currently own the required POAP (ID: ${conditionValues}). Visit the quest location to claim it.`,
        duration: 6000,
      });
    }

    return hasPoap;
  } catch (error) {
    console.error(`Error verifying POAP for quest ${questId}:`, error);
    // Show error feedback to user
    toast.error('⚠️ Verification Error', {
      description: 'Unable to verify POAP ownership at this time. Please try again later.',
      duration: 5000,
    });
    return false;
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
  alert(`TODO: Checking wallet connection with values: ${conditionValues}`);
  return true;
}

/**
 * Check if the user's ticket is associated with their account
 * @param questId - The ID of the quest
 * @param conditionValues - Ticket association requirements
 * @returns Promise<boolean> - True if ticket is associated
 */
export async function isTicketAssociated(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement ticket association check logic
  alert(`TODO: Checking ticket association with values: ${conditionValues}`);
  return true;
}

/**
 * Check if the user's profile is properly set up
 * @param questId - The ID of the quest
 * @param conditionValues - Profile setup requirements
 * @returns Promise<boolean> - True if profile is set up
 */
export async function isProfileSetup(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement profile setup check logic
  alert(`TODO: Checking profile setup with values: ${conditionValues}`);
  return true;
}

/**
 * Check if the user has visited the required link
 * @param questId - The ID of the quest
 * @param conditionValues - Link visit requirements
 * @returns Promise<boolean> - True if link has been visited
 */
export async function isLinkVisited(questId: string, conditionValues: string): Promise<boolean> {
  // TODO: Implement link visit check logic
  alert(`TODO: Checking link visit with values: ${conditionValues}`);
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
  alert(`TODO: Checking mini quiz completion with values: ${conditionValues}`);
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
  alert(`TODO: Verifying balance with values: ${conditionValues}`);
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
    case 'verifyPoap':
      return verifyPoap(questId, conditionValues, userAddresses);
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
