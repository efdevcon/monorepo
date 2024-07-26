import { PropsWithChildren } from "react";
import { Navbar } from "./layout/navbar";
import { Footer } from "./layout/footer";

export function Layout(props: PropsWithChildren) {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />

      <main className="container mx-auto">{props.children}</main>

      <Footer />
    </main>
  );
}
