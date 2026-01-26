// Nextjs quirk requires us to have a separate layout.native-app.tsx file for the native app, this way we can choose to statically build just the pages that need to be built for the app to run fully client side (layout + index page)

export { default, metadata } from "./layout";
