// Nextjs quirk requires us to have a separate layout.native-app.tsx file for the native app, this way we can choose to statically build just the pages that need to be built for the app to run fully client side (layout + index page)
import MainLayout from "./layout";
import PageLayout from "./(page-layout)/layout";
import { PropsWithChildren } from "react";

export default function Layout(props: PropsWithChildren) {
  return <MainLayout><PageLayout>{props.children}</PageLayout></MainLayout>;
}