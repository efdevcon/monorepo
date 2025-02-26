import { PropsWithChildren } from "react";
import { Footer } from "./layout/footer";
import { Header } from "./layout/header";
import { Hero } from "./hero";

export function Layout(props: PropsWithChildren) {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <Hero />

      <main className="container mx-auto">{props.children}</main>

      <Footer />
    </main>
  );
}
