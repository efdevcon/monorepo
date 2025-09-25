"use client";

import {
  useRouter,
  usePathname,
  useSearchParams,
  ReadonlyURLSearchParams,
} from "next/navigation";
import { useOptimistic, useTransition } from "react";

export function useOptimisticSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Keep an optimistic version of search params
  const [optimisticParams, setOptimisticParams] = useOptimistic(
    searchParams,
    (state, newParams) => newParams as ReadonlyURLSearchParams
  );

  const updateSearchParams = (updates: any) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, value as string);
      }
    });

    // Update optimistically first (instant UI update)
    startTransition(() => {
      setOptimisticParams(newParams);
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    });
  };

  return {
    searchParams: optimisticParams || searchParams,
    updateSearchParams,
    isPending,
  };
}
