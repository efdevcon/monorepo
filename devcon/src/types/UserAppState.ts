export interface UserAppState {
  updatedAt: Date,
  favoritedSpeakers?: {
    [key: string]: true
  },
  bookmarkedSessions?: {
    [key: string]: {
      interestLevel: 'interested' | 'attending',
      // Start and end time need to be saved at time of bookmarking - allows us to create "session changed" notifications client side by diffing the schedule with the bookmarked snapshots
      start: Date
      end: Date
    }
  }
}

/*
  appState: {
    updatedAt: timestamp,
    favoritedSpeakers: {
      speaker1: true,
      speaker2: true
      speaker3: true
    },
    bookmarkedSessions: {
      session1: {
        interestLevel: 'interested',
        startTime: // Need to keep these values at hand so we can create notifications should favorited sessions change
        endTime: //
        duration: //
      },
      session2: {
        interestLevel: 'attending',
      },      
      session3: {
        interestLevel: 'interested',
      },
    }
  }
*/
