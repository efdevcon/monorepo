import { usePathname, useSearchParams } from "next/navigation";

export const useQueryStringer = (
  object: { [key: string]: any },
  replaceState?: boolean,
  preserveUnmanagedKeys?: boolean
): string => {
  const isBrowser = typeof window !== "undefined";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  let formattedObject = {} as any;

  Object.entries(object).forEach(([key, val]) => {
    if (!val) return;

    if (typeof val === "object") {
      formattedObject[key] = Object.keys(val);
    }
    if (typeof val === "string") {
      formattedObject[key] = val;
    }
  });

  // "preserveUnmanagedKeys" will ensure only the keys passed to useQueryString are updated - any existing query strings won't be affected/overwritten by useQueryStringer
  // This is highly contextual so it's off by default
  if (preserveUnmanagedKeys) {
    const managedKeys = Object.keys(object);
    const currentParams = new URLSearchParams(searchParams.toString());
    const unmanagedKeys = Array.from(currentParams.entries()).reduce(
      (acc, [key, val]) => {
        if (managedKeys.includes(key)) return acc;
        acc[key] = val;
        return acc;
      },
      {} as { [key: string]: any }
    );

    formattedObject = {
      ...formattedObject,
      ...unmanagedKeys,
    };
  }

  const params = new URLSearchParams();
  Object.entries(formattedObject).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach((v) => params.append(key, v));
    } else {
      params.append(key, String(val));
    }
  });

  let result = `?${params.toString()}`;

  if (result === "?") result = "";

  if (replaceState && isBrowser) {
    const url = `${pathname}${result}`;
    // TODO: Fix filtering to queryString
    // window.history.replaceState(null, "", url);
  }

  return result;
};
