"use client";

import { Auth } from "@/components/Auth";
import { useSkipLogin } from "@/data/auth/useSkipLogin";
import { useLoginTransition } from "@/components/LoginTransition";

export default function LoginPage() {
  const { skip } = useSkipLogin();
  const { play } = useLoginTransition();

  return (
    <Auth
      onSkip={() => {
        skip();
        play(); // play() also navigates home
      }}
    />
  );
}
