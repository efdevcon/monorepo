"use client";

import APP_CONFIG from "@/CONFIG";
import { useUser } from "@/data/auth/useUser";
import { Tickets } from "./Tickets";

export function Menu() {
  const { user } = useUser();
  const name = user?.email?.split("@")[0];

  return (
    <main className="py-6">
      {/* Welcome hero */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-[#3D00BF]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login/backdrop.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative flex min-h-[220px] flex-col justify-end p-6 text-white">
          <p className="text-sm font-medium text-white/80">
            {name ? `Welcome back, ${name} 👋` : "Hello, welcome 👋"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{APP_CONFIG.APP_NAME}</h1>
          <p className="mt-1 max-w-md text-sm text-white/80">
            {APP_CONFIG.APP_DESCRIPTION}
          </p>
        </div>
      </section>

      {/* Tickets — also shown logged-out to prompt getting a ticket. */}
      <Tickets />
    </main>
  );
}
