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
  | 'Onboarding level 1'
  | 'Onboarding level 2'
  | 'Onboarding level 3'
  | 'Defi'
  | 'L2s'
  | 'Social';

/**
 * Quest groups without numbered prefixes
 */
export type QuestGroup = 
  | 'Onboarding'
  | 'App Showcase';

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
  /** Quest name/title */
  name: string;
  
  /** Display order */
  order: number;
  
  /** Points awarded for completing the quest */
  points: number;
  
  /** Quest category */
  category: QuestCategory;
  
  /** Quest group */
  group: QuestGroup;
  
  /** Difficulty level */
  difficulty: QuestDifficulty;
  
  /** Quest instructions/description */
  instructions: string;
  
  /** Action type to perform */
  action: QuestAction;
  
  /** Button text to display */
  button: string;
  
  /** Type of condition to check for completion */
  conditionType: QuestConditionType;
  
  /** Values for the condition check */
  conditionValues: string;
  
  /** Unique quest identifier */
  id: string;
  
  /** Booth check-in code for physical verification */
  boothCode: string;
  
  /** URL to the quest logo/image */
  logoLink: string;
  
  /** URL to the POAP image */
  poapImageLink: string;
  
  /** Position coordinates (e.g., "200,500") */
  position: string;
}

/**
 * Component Quest interface that extends ApiQuest with state management
 */
export interface ComponentQuest extends Quest {
  state: {
    status: 'completed' | 'active' | 'locked';
    is_locked: boolean;
  };
}
