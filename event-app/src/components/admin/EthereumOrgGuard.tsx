"use client";

import type { ReactNode } from "react";
import { useUser } from "@/data/auth/useUser";

const ALLOWED_DOMAIN = "@ethereum.org";

/** Whether an email belongs to the Ethereum Foundation. */
export function isEthereumOrg(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

/**
 * Client gate for admin tooling: renders children only for a signed-in user
 * whose email is `@ethereum.org`. This guards the UI; the underlying admin API
 * route enforces the same rule server-side.
 */
export function EthereumOrgGuard({ children }: { children: ReactNode }) {
  const { user, hasInitialized } = useUser();

  if (!hasInitialized) {
    return <p className="py-16 text-center text-gray-500">Checking access…</p>;
  }

  if (!user) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p className="text-lg font-semibold text-gray-700">Sign in required</p>
        <p className="mt-1 text-sm">
          This tool is only available to signed-in Ethereum Foundation accounts.
        </p>
      </div>
    );
  }

  if (!isEthereumOrg(user.email)) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p className="text-lg font-semibold text-gray-700">Not authorized</p>
        <p className="mt-1 text-sm">
          {user.email
            ? `${user.email} doesn’t have access to this tool.`
            : "Your account doesn’t have access to this tool."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
