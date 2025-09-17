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
   * Quest group names with numbered prefixes
  */
export type QuestGroupName =
  | 'Setup & app tour'
  | 'App Showcase'
  | 'World’s Fair interactions'
  | 'Explore the Ethereum ecosystem'

/**
 * Quest group object
 */
export type QuestGroup = {
  id: number;
  name: QuestGroupName;
  description: string;
  image: string;
}
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
 * Quest interface representing a quest item
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

  /** Group ID of the quest (computed field) */
  groupId: number;

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
