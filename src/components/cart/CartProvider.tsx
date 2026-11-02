"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { z } from "zod";
import {
  addToCart,
  getCartItems,
  mergeGuestCart,
  removeItem,
  updateQuantity,
  type CartActionResult,
} from "@/app/keranjang/actions";
import type { CartQuantity } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { useGuestCartStore } from "@/stores/cart";

const hydratedProductSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  price_idr: z.number().int(),
  stock: z.number().int().nonnegative(),
  co2e_avoided_kg: z.number(),
  plastic_avoided_g: z.number().int(),
  images: z.array(z.string()),
});

const hydrateResponseSchema = z.object({
  products: z.array(hydratedProductSchema),
});

type HydratedProduct = z.infer<typeof hydratedProductSchema>;

export type CartDisplayItem = CartQuantity & {
  product: HydratedProduct | null;
};

type CartOperationResult = {
  ok: boolean;
  message?: string;
};

type CartContextValue = {
  items: CartDisplayItem[];
  itemCount: number;
  subtotal: number;
  totalCo2eKg: number;
  totalPlasticAvoidedG: number;
  isReady: boolean;
  isCountReady: boolean;
  isSignedIn: boolean;
  isDrawerOpen: boolean;
  notice: string | null;
  setDrawerOpen: (open: boolean) => void;
  addProduct: (
    productId: string,
    quantity: number,
  ) => Promise<CartOperationResult>;
  changeQuantity: (
    productId: string,
    quantity: number,
  ) => Promise<CartOperationResult>;
  deleteItem: (productId: string) => Promise<CartOperationResult>;
};

const CartContext = createContext<CartContextValue | null>(null);

const pendingMerges = new Map<string, Promise<CartActionResult>>();

function mergeOnce(
  userId: string,
  items: CartQuantity[],
): Promise<CartActionResult> {
  const key = `${userId}:${JSON.stringify(items)}`;
  const existing = pendingMerges.get(key);
  if (existing) return existing;

  const request = mergeGuestCart(items).finally(() => {
    pendingMerges.delete(key);
  });
  pendingMerges.set(key, request);
  return request;
}

function cartNotice(result: CartActionResult): string | null {
  if (!result.ok) return result.message;
  if (result.unavailableProductIds?.length) {
    return "Produk yang sudah habis atau tidak tersedia dihapus dari keranjang.";
  }
  if (result.adjustedProductIds?.length) {
    return "Jumlah beberapa produk disesuaikan dengan stok terbaru.";
  }
  return null;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const guestItems = useGuestCartStore((state) => state.items);
  const guestHydrated = useGuestCartStore((state) => state.hydrated);
  const guestItemsRef = useRef(guestItems);
  guestItemsRef.current = guestItems;

  const [userId, setUserId] = useState<string | null>(null);
  const [accountItems, setAccountItems] = useState<CartQuantity[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [products, setProducts] = useState<Record<string, HydratedProduct>>({});
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hydrateRevision, setHydrateRevision] = useState(0);

  const setDrawerOpen = useCallback((open: boolean) => {
    setIsDrawerOpen(open);
    if (open) setHydrateRevision((revision) => revision + 1);
  }, []);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    void useGuestCartStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!guestHydrated) return;

    let active = true;
    let requestId = 0;
    const supabase = createClient();

    const syncUserCart = async (nextUserId: string | null) => {
      const currentRequestId = ++requestId;
      setAuthReady(false);

      if (!nextUserId) {
        setUserId(null);
        setAccountItems([]);
        setNotice(null);
        setAuthReady(true);
        return;
      }

      setUserId(nextUserId);
      const localItems = guestItemsRef.current;
      let result: CartActionResult;

      try {
        result = localItems.length
          ? await mergeOnce(nextUserId, localItems)
          : await getCartItems();
      } catch {
        result = {
          ok: false,
          message:
            "Keranjang belum berhasil disinkronkan. Coba muat ulang halaman.",
        };
      }

      if (!active || currentRequestId !== requestId) return;
      if (result.ok) {
        if (localItems.length) useGuestCartStore.getState().clear();
        setAccountItems(result.items);
        setNotice(cartNotice(result));
      } else {
        setNotice(result.message);
      }
      setAuthReady(true);
    };

    void supabase.auth.getUser().then(({ data, error }) => {
      if (error && error.name !== "AuthSessionMissingError") {
        if (active) {
          setNotice("Sesi belum berhasil diperiksa. Coba muat ulang halaman.");
          setAuthReady(true);
        }
        return;
      }
      void syncUserCart(data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        void syncUserCart(session?.user.id ?? null);
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [guestHydrated, pathname]);

  const activeItems = userId ? accountItems : guestItems;
  const productIdsKey = activeItems.map((item) => item.productId).join(",");

  useEffect(() => {
    if (!authReady || !guestHydrated) return;
    const productIds = productIdsKey ? productIdsKey.split(",") : [];

    if (productIds.length === 0) {
      setProducts({});
      setHydrated(true);
      return;
    }

    let active = true;
    setHydrated(false);

    async function hydrateProducts() {
      try {
        const response = await fetch("/api/cart/hydrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds }),
        });
        const body: unknown = await response.json();

        if (!response.ok) {
          throw new Error("Produk belum berhasil dimuat.");
        }

        const parsed = hydrateResponseSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error("Data produk dari server tidak valid.");
        }

        if (active) {
          setProducts(
            Object.fromEntries(
              parsed.data.products.map((product) => [product.id, product]),
            ),
          );
          setHydrated(true);
        }
      } catch {
        if (active) {
          setNotice("Harga dan stok keranjang belum berhasil diperbarui.");
          setHydrated(true);
        }
      }
    }

    void hydrateProducts();
    return () => {
      active = false;
    };
  }, [authReady, guestHydrated, pathname, productIdsKey, hydrateRevision]);

  const items = useMemo(
    () =>
      activeItems.map((item) => ({
        ...item,
        product: products[item.productId] ?? null,
      })),
    [activeItems, products],
  );
  const itemCount = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (item.product?.price_idr ?? 0) * item.quantity,
    0,
  );
  const totalCo2eKg = items.reduce(
    (sum, item) => sum + (item.product?.co2e_avoided_kg ?? 0) * item.quantity,
    0,
  );
  const totalPlasticAvoidedG = items.reduce(
    (sum, item) => sum + (item.product?.plastic_avoided_g ?? 0) * item.quantity,
    0,
  );

  const applyActionResult = useCallback((result: CartActionResult) => {
    if (!result.ok) {
      setNotice(result.message);
      return { ok: false, message: result.message };
    }

    setAccountItems(result.items);
    setNotice(cartNotice(result));
    return { ok: true, message: cartNotice(result) ?? undefined };
  }, []);

  const addProduct = useCallback(
    async (productId: string, quantity: number) => {
      if (!authReady) {
        return { ok: false, message: "Keranjang sedang disiapkan. Coba lagi." };
      }
      if (userId) {
        try {
          const actionResult = await addToCart({ productId, quantity });
          const result = applyActionResult(actionResult);
          if (
            result.ok &&
            actionResult.ok &&
            actionResult.adjustedProductIds?.includes(productId)
          ) {
            return {
              ok: false,
              message:
                "Stok tidak cukup. Jumlah di keranjang disesuaikan dengan stok terbaru.",
            };
          }
          return result;
        } catch {
          const message = "Produk belum berhasil ditambahkan ke keranjang.";
          setNotice(message);
          return { ok: false, message };
        }
      }

      let latestProduct: HydratedProduct | undefined;
      try {
        const response = await fetch("/api/cart/hydrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [productId] }),
        });
        const body: unknown = await response.json();
        const parsed = hydrateResponseSchema.safeParse(body);

        if (!response.ok || !parsed.success) {
          throw new Error("Produk belum berhasil dimuat.");
        }

        latestProduct = parsed.data.products[0];
      } catch {
        const message = "Stok terbaru belum berhasil dimuat. Coba lagi.";
        setNotice(message);
        return { ok: false, message };
      }

      if (!latestProduct || latestProduct.stock < 1) {
        const message = "Produk ini sedang tidak tersedia.";
        setNotice(message);
        return { ok: false, message };
      }

      setProducts((current) => ({ ...current, [productId]: latestProduct }));
      const previous =
        useGuestCartStore
          .getState()
          .items.find((item) => item.productId === productId)?.quantity ?? 0;
      const next = Math.min(99, previous + quantity, latestProduct.stock);
      if (next <= previous) {
        const message =
          "Stok tidak cukup. Keranjang sudah mencapai jumlah yang tersedia.";
        setNotice(message);
        return { ok: false, message };
      }

      useGuestCartStore
        .getState()
        .addItem(productId, quantity, latestProduct.stock);
      const limitedByStock = next < previous + quantity;
      const message = limitedByStock
        ? "Stok tidak cukup. Jumlah di keranjang disesuaikan dengan stok terbaru."
        : "Produk ditambahkan ke keranjang.";
      setNotice(message);
      return { ok: !limitedByStock, message };
    },
    [applyActionResult, authReady, userId],
  );

  const deleteItem = useCallback(
    async (productId: string): Promise<CartOperationResult> => {
      if (userId) {
        try {
          return applyActionResult(await removeItem({ productId }));
        } catch {
          const message = "Produk belum berhasil dihapus dari keranjang.";
          setNotice(message);
          return { ok: false, message };
        }
      }

      useGuestCartStore.getState().removeItem(productId);
      setNotice("Produk dihapus dari keranjang.");
      return { ok: true };
    },
    [applyActionResult, userId],
  );

  const changeQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity < 1) return deleteItem(productId);
      if (userId) {
        try {
          return applyActionResult(
            await updateQuantity({ productId, quantity }),
          );
        } catch {
          const message = "Jumlah produk belum berhasil diperbarui.";
          setNotice(message);
          return { ok: false, message };
        }
      }

      const product = products[productId];
      if (!product || product.stock < 1) {
        const message = "Stok produk habis. Hapus produk dari keranjang.";
        setNotice(message);
        return { ok: false, message };
      }

      useGuestCartStore
        .getState()
        .setQuantity(productId, quantity, product.stock);
      if (quantity > product.stock) {
        const message = "Jumlah disesuaikan dengan stok terbaru.";
        setNotice(message);
        return { ok: true, message };
      }
      setNotice(null);
      return { ok: true };
    },
    [applyActionResult, deleteItem, products, userId],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      totalCo2eKg,
      totalPlasticAvoidedG,
      isReady: authReady && guestHydrated && hydrated,
      isCountReady: authReady && guestHydrated,
      isSignedIn: Boolean(userId),
      isDrawerOpen,
      notice,
      setDrawerOpen,
      addProduct,
      changeQuantity,
      deleteItem,
    }),
    [
      items,
      itemCount,
      subtotal,
      totalCo2eKg,
      totalPlasticAvoidedG,
      authReady,
      guestHydrated,
      hydrated,
      userId,
      isDrawerOpen,
      notice,
      addProduct,
      changeQuantity,
      deleteItem,
      setDrawerOpen,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart harus digunakan di dalam CartProvider.");
  }
  return context;
}
