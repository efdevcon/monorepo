"use client";

import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { ReactNode, useContext, createContext, useCallback, useEffect, useState } from "react";

// Debug/dev query params that should follow the user across internal navigation
// so a selected dataset and mocked time persist between pages. These live only
// in the URL (no separate storage), so carrying them forward is all that's
// needed. See DebugPanel and src/data/dataset.ts / hooks/useNow.ts.
const CARRIED_PARAMS = ["dataset", "mockNow", "mockSpeed", "debug"];

function withCarriedParams(href: string): string {
  if (typeof window === "undefined") return href;
  // Only touch internal, non-anchor paths.
  if (/^([a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }
  const current = new URLSearchParams(window.location.search);
  const carried = CARRIED_PARAMS.filter((k) => current.has(k));
  if (carried.length === 0) return href;

  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const pathAndQuery = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const [path, existingQuery = ""] = pathAndQuery.split("?");

  const params = new URLSearchParams(existingQuery);
  for (const k of carried) {
    // Don't override a param the href already sets explicitly.
    if (!params.has(k)) params.set(k, current.get(k) as string);
  }
  const qs = params.toString();
  return `${path}${qs ? `?${qs}` : ""}${hash}`;
}

// Context for native navigation - null in web context
interface NativeNavigationContextValue {
  navigate: (href: string) => void;
  goBack: () => void;
  canGoBack: boolean;
  prefetch: boolean;
}

export const NativeNavigationContext = createContext<NativeNavigationContextValue | null>(null);

// Overloaded Link component
interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function Link({ href, children, className, ...nextLinkProps }: LinkProps & React.ComponentProps<typeof NextLink>) {
  const nativeNav = useContext(NativeNavigationContext);

  // Augment the href with carried debug params only after mount: SSR and the
  // first client render must match `href` to avoid a hydration mismatch on the
  // anchor's href; afterwards we carry dataset/mock-time params forward.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const finalHref = mounted ? withCarriedParams(href) : href;

  if (nativeNav) {
    return (
      <div
        onClick={() => nativeNav.navigate(withCarriedParams(href))}
        onKeyDown={(e) => e.key === "Enter" && nativeNav.navigate(withCarriedParams(href))}
        role="button"
        tabIndex={0}
        className={className}
      >
        {children}
      </div>
    );
  }

  return (
    <NextLink href={finalHref} className={className} {...nextLinkProps}>
      {children}
    </NextLink>
  );
}

// Overloaded useRouter hook
export function useRouter() {
  const nativeNav = useContext(NativeNavigationContext);
  const nextRouter = useNextRouter();

  const push = useCallback(
    (href: string) => {
      const target = withCarriedParams(href);
      if (nativeNav) {
        nativeNav.navigate(target);
        return;
      }
      nextRouter.push(target);
    },
    [nativeNav, nextRouter]
  );

  const back = useCallback(() => {
    if (nativeNav && nativeNav.canGoBack) {
      nativeNav.goBack();
      return;
    }
    nextRouter.back();
  }, [nativeNav, nextRouter]);

  return {
    push,
    back,
    replace: nextRouter.replace,
    prefetch: nextRouter.prefetch,
    refresh: nextRouter.refresh,
  };
}

// BackButton component
interface BackButtonProps {
  children?: ReactNode;
  className?: string;
  fallbackHref?: string;
}

export function BackButton({ children, className, fallbackHref = "/" }: BackButtonProps) {
  const nativeNav = useContext(NativeNavigationContext);
  const router = useRouter();

  if (nativeNav) {
    if (!nativeNav.canGoBack) return null;
    return (
      <button onClick={() => nativeNav.goBack()} className={className}>
        {children || "← Back"}
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={className}
    >
      {children || "← Back"}
    </button>
  );
}
