"use client";

import { PropsWithChildren } from "react";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/hero";
import { usePathname } from "next/navigation";
import css from "./archive.module.scss";

export function Layout(props: PropsWithChildren) {
  const pathName = usePathname();
  const isHome = pathName === "/";

  return (
    <main className={`flex min-h-screen flex-col ${css.container}`}>
      <Header />

      {isHome && <Hero />}

      <main className="mx-auto">{props.children}</main>

      <Footer />
    </main>
  );
}
