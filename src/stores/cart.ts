"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { clampCartQuantity, type CartQuantity } from "@/lib/cart";

const persistedCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(100),
});

type GuestCartState = {
  items: CartQuantity[];
  hydrated: boolean;
  addItem: (productId: string, quantity: number, stock: number) => void;
  setQuantity: (productId: string, quantity: number, stock: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      addItem: (productId, quantity, stock) =>
        set((state) => {
          const current = state.items.find((item) => item.productId === productId);
          const nextQuantity = clampCartQuantity(
            (current?.quantity ?? 0) + quantity,
            stock,
          );
          const items = state.items.filter((item) => item.productId !== productId);

          return {
            items:
              nextQuantity > 0
                ? [...items, { productId, quantity: nextQuantity }]
                : items,
          };
        }),
      setQuantity: (productId, quantity, stock) =>
        set((state) => {
          const nextQuantity = clampCartQuantity(quantity, stock);
          return {
            items:
              nextQuantity > 0
                ? state.items.map((item) =>
                    item.productId === productId
                      ? { ...item, quantity: nextQuantity }
                      : item,
                  )
                : state.items,
          };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),
      clear: () => set({ items: [] }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "bb-cart-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      merge: (persistedState, currentState) => {
        const parsed = persistedCartSchema.safeParse(persistedState);
        const items = parsed.success
          ? Array.from(
              parsed.data.items.reduce((merged, item) => {
                merged.set(
                  item.productId,
                  Math.min(
                    99,
                    (merged.get(item.productId) ?? 0) + item.quantity,
                  ),
                );
                return merged;
              }, new Map<string, number>()),
              ([productId, quantity]) => ({ productId, quantity }),
            )
          : [];

        return { ...currentState, items };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
