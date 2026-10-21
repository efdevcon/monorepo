/*
  WORK IN PROGRESS:
  CONFIG.ts is used to configure the app for reusability by other Ethereum ecosystem events, the checklist is: 
    [ ] update this file
    [ ] run your own data provider adhering to the provider interface (see data/providers/provider-interface.ts)
    (note: if you use Pretalx and Pretix, you can reuse our data provider implementation (data/providers/pretalx-pretix-data-provider.ts))
    [ ] replace the app icons in public/ (apple-touch-icon, android-chrome-*, icon-maskable-512, favicon*, og-image.jpg) and src/app/favicon.ico
    [ ] add para api key (for authentication)
    [ ] add supabase keys (for user data storage)
    [ ] apple developer account for publishing the app to the app store (the app is also available as a web app with pwa capabilities, so this is optional)
*/

const APP_CONFIG = {
  // App metadata. Two names on purpose:
  // - HOME_SCREEN_NAME labels the installed app (manifest name/short_name,
  //   iOS apple-mobile-web-app-title). iOS keeps the name an app was
  //   installed with until it is re-installed, so it carries the edition,
  //   like the Devcon VIII icon beside it; each edition gets a re-install push.
  // - APP_NAME is the title everywhere that updates with a deploy: browser
  //   tabs ("Schedule - Devcon 8 App"), share previews, the install button.
  // Marketing copy (posts, QR codes, devcon.org) says "Devcon App".
  // Titles separate parts with " - ", not a middle dot.
  APP_NAME: "Devcon 8 App",
  HOME_SCREEN_NAME: "Devcon 8",
  APP_DESCRIPTION:
    "The official app for Devcon 8 India. Explore the schedule and speakers, plan your days, and find your way around the venue. Mumbai, 3–6 November 2026.",

  // Public origin of this deployment. Used server-side (e.g.
  // /api/manifest-bridge, push tap-through links) to build absolute URLs —
  // deriving it from the incoming request's own URL isn't reliable behind
  // Netlify's serverless function proxying, which doesn't necessarily
  // preserve the public host. Inlined at build time by next.config.ts:
  // Netlify's primary domain on production builds, the deploy's own URL on
  // previews and branch deploys (APP_ORIGIN overrides both when set), else the
  // production site. A push URL only opens inside the installed app
  // when it is on that install's origin.
  APP_ORIGIN: process.env.APP_ORIGIN || "https://devcon-event-app.netlify.app",
  // Host of the server-rendered social cards (og:image). The renderers,
  // fonts, brand art and Supabase render cache live on devcon.org
  // (devcon/src/pages/api/social/*), so the app only links to them.
  SOCIAL_CARD_ORIGIN:
    process.env.NEXT_PUBLIC_SOCIAL_CARD_ORIGIN || "https://devcon.org",

  // Feature flags - enable/disable routes
  SCHEDULE_ENABLED: true, // /schedule, /schedule/[id]
  SPEAKERS_ENABLED: true, // /speakers, /speakers/[id]
  ROOMS_ENABLED: true, // /room-screens/[id]
  MAP_ENABLED: true, // /map (venue map)
  ANNOUNCEMENTS_ENABLED: true, // /notifications (Notion-authored inbox + session reminders) + home section
  INFERENCE_DEBUG_ENABLED: true, // /admin/inference-test (EF-only RAG debugger)

  // Development settings
  RUNTIME_VALIDATION: process.env.NODE_ENV === "development",
};

export default APP_CONFIG;
