import { PropsWithChildren } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/hero";

export function Layout(props: PropsWithChildren) {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <Hero />

      <main className="mx-auto">{props.children}</main>

      <Footer />
    </main>
  );
}
