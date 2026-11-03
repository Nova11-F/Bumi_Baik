"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type CatalogNavigationValue = {
  isPending: boolean;
  navigate: (href: string, history?: "push" | "replace") => void;
};

const CatalogNavigationContext = createContext<CatalogNavigationValue | null>(
  null,
);

export function CatalogNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = useCallback(
    (href: string, history: "push" | "replace" = "replace") => {
      startTransition(() => {
        if (history === "push") {
          router.push(href, { scroll: false });
        } else {
          router.replace(href, { scroll: false });
        }
      });
    },
    [router],
  );
  const value = useMemo(() => ({ isPending, navigate }), [isPending, navigate]);

  return (
    <CatalogNavigationContext.Provider value={value}>
      <div
        aria-busy={isPending}
        className={`transition-opacity ${isPending ? "opacity-60" : ""}`}
      >
        {children}
      </div>
    </CatalogNavigationContext.Provider>
  );
}

export function useCatalogNavigation(): CatalogNavigationValue {
  const context = useContext(CatalogNavigationContext);
  if (!context) {
    throw new Error(
      "useCatalogNavigation harus digunakan di dalam CatalogNavigation.",
    );
  }
  return context;
}
