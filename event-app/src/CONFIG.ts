/*
  WORK IN PROGRESS:
  CONFIG.ts is used to configure the app for reusability by other Ethereum ecosystem events, the checklist is: 
    [ ] update this file
    [ ] run your own data provider adhering to the provider interface (see data/providers/provider-interface.ts)
    (note: if you use Pretalx and Pretix, you can reuse our data provider implementation (data/providers/pretalx-pretix-data-provider.ts))
    [ ] update public/app-icon.png and src/app/favicon.ico with your own app icons
    [ ] add para api key (for authentication)
    [ ] add supabase keys (for user data storage)
    [ ] apple developer account for publishing the app to the app store (the app is also available as a web app with pwa capabilities, so this is optional)
*/

const APP_CONFIG = {
  // App metadata
  APP_NAME: "Devcon App",
  APP_DESCRIPTION: "Ethereum knitting club.",

  // Feature flags - enable/disable routes
  SCHEDULE_ENABLED: true, // /schedule, /schedule/[id]
  SPEAKERS_ENABLED: true, // /speakers, /speakers/[id]
  ROOMS_ENABLED: true, // /room-screens/[id]

  // Development settings
  RUNTIME_VALIDATION: process.env.NODE_ENV === "development",
};

export default APP_CONFIG;