const APP_CONFIG = {
  // App metadata
  APP_NAME: "ETHGlobal",
  APP_DESCRIPTION: "A platform for managing and promoting events",

  // Feature flags - enable/disable routes
  SCHEDULE_ENABLED: true, // /schedule, /schedule/[id]
  SPEAKERS_ENABLED: true, // /speakers, /speakers/[id]
  ROOMS_ENABLED: true, // /room-screens/[id]

  // Development settings
  RUNTIME_VALIDATION: process.env.NODE_ENV === "development",
};

export default APP_CONFIG;