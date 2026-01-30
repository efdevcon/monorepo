"use client";

import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { ReactNode, useContext, createContext, useCallback } from "react";

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

  if (nativeNav) {
    return (
      <div
        onClick={() => nativeNav.navigate(href)}
        onKeyDown={(e) => e.key === "Enter" && nativeNav.navigate(href)}
        role="button"
        tabIndex={0}
        className={className}
      >
        {children}
      </div>
    );
  }

  return (
    <NextLink href={href} className={className} {...nextLinkProps}>
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
      if (nativeNav) {
        nativeNav.navigate(href);
        return;
      }
      nextRouter.push(href);
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
