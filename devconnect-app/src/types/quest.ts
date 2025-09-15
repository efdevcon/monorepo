/**
 * Action types that can be performed for quests
 */
export type QuestAction = 
  | 'verify-basename'
  | 'todo'
  | 'verify-payment'
  | 'claim-poap'
  | 'connect-wallet'
  | 'associate-ticket'
  | 'setup-profile'
  | 'visit-link'
  | 'mini-quiz'
  | 'verify-balance';

/**
 * Condition types for quest completion verification
 */
export type QuestConditionType = 
  | 'verifyBasename'
  | 'numberOfCryptoPayment'
  | 'verifyPoap'
  | 'isWalletConnected'
  | 'isTicketAssociated'
  | 'isProfileSetup'
  | 'isLinkVisited'
  | 'isMiniQuizCompleted'
  | 'verifyBalance'
  | '';

/**
 * Quest categories without numbered prefixes
 */
export type QuestCategory = 
  | 'Defi'
  | 'L2s'
  | 'Social';

/**
 * Quest groups without numbered prefixes
 */
export type QuestGroup = 
  | '1. Setup & app tour'
  | '2. App Showcase'
  | '3. World’s Fair interactions'
  | '4. Explore the Ethereum ecosystem'

/**
 * Quest difficulty levels without numbered prefixes
 */
export type QuestDifficulty = 
  | 'Beginner'
  | 'Easy'
  | 'Medium'
  | 'Hard'
  | 'Expert';

/**
 * Quest interface representing a quest item from the API
 */
export interface Quest {
  /** Unique quest identifier */
  id: number;

  /** Quest name/title */
  name: string;
  
  /** Display order */
  order: number;
  
  /** Points awarded for completing the quest */
  points: number;

  /** Difficulty level */
  difficulty: string;
  
  /** Quest instructions/description */
  instructions: string;
  
  /** Action type to perform */
  action: string;
  
  /** Button text to display */
  button: string;
  
  /** Type of condition to check for completion */
  conditionType: string;
  
  /** Values for the condition check */
  conditionValues: string;
  
  /** Related supporter ID (if any) */
  supporterId: string;
  
  /** URL to the POAP image */
  poapImageLink: string;

  /** Group of the quest */
  group: QuestGroup;

  /** District ID of the quest (computed field based on supporterId) */
  districtId?: number;

  /** District slug of the quest (computed field based on supporterId) */
  districtSlug?: string;
}

/**
 * Component Quest interface that extends ApiQuest with state management
 */
export interface ComponentQuest extends Quest {
  state: {
    status: 'completed' | 'active' | 'locked';
    is_locked: boolean;
    isCheckedIn?: boolean;
  };
}
