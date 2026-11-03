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
  type Context,
} from "react";
import { CircleAlert, X } from "lucide-react";
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

export type CartProductSnapshot = z.infer<typeof hydratedProductSchema>;
type HydratedProduct = CartProductSnapshot;

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
    product: CartProductSnapshot,
    quantity: number,
  ) => Promise<CartOperationResult>;
  changeQuantity: (
    productId: string,
    quantity: number,
  ) => Promise<CartOperationResult>;
  deleteItem: (productId: string) => Promise<CartOperationResult>;
};

type CartItemsValue = Pick<
  CartContextValue,
  | "items"
  | "subtotal"
  | "totalCo2eKg"
  | "totalPlasticAvoidedG"
  | "isReady"
  | "isSignedIn"
>;
type CartHeaderValue = Pick<
  CartContextValue,
  "itemCount" | "isCountReady" | "setDrawerOpen"
>;
type CartDrawerValue = Pick<
  CartContextValue,
  "isDrawerOpen" | "notice" | "setDrawerOpen"
>;
type CartActionsValue = Pick<
  CartContextValue,
  "addProduct" | "changeQuantity" | "deleteItem"
>;

const CartItemsContext = createContext<CartItemsValue | null>(null);
const CartHeaderContext = createContext<CartHeaderValue | null>(null);
const CartDrawerContext = createContext<CartDrawerValue | null>(null);
const CartActionsContext = createContext<CartActionsValue | null>(null);

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
  const accountItemsRef = useRef(accountItems);
  accountItemsRef.current = accountItems;
  const [authReady, setAuthReady] = useState(false);
  const [products, setProducts] = useState<Record<string, HydratedProduct>>({});
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hydrateRevision, setHydrateRevision] = useState(0);
  const quantityTimers = useRef(new Map<string, number>());
  const quantitySnapshots = useRef(new Map<string, CartQuantity | null>());
  const mutationVersions = useRef(new Map<string, number>());

  const updateAccountItems = useCallback(
    (update: (items: CartQuantity[]) => CartQuantity[]) => {
      const nextItems = update(accountItemsRef.current);
      accountItemsRef.current = nextItems;
      setAccountItems(nextItems);
    },
    [],
  );

  const nextMutationVersion = useCallback((productId: string) => {
    const version = (mutationVersions.current.get(productId) ?? 0) + 1;
    mutationVersions.current.set(productId, version);
    return version;
  }, []);

  const setAccountItem = useCallback(
    (productId: string, item: CartQuantity | null) => {
      updateAccountItems((items) => {
        const remaining = items.filter(
          (current) => current.productId !== productId,
        );
        return item ? [...remaining, item] : remaining;
      });
    },
    [updateAccountItems],
  );

  const showCartToast = useCallback((message: string) => {
    setCartToast(message);
  }, []);

  useEffect(() => {
    if (!cartToast) return;
    const timer = window.setTimeout(() => setCartToast(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [cartToast]);

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
        updateAccountItems(() => []);
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
        updateAccountItems(() => result.items);
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
  }, [guestHydrated, pathname, updateAccountItems]);

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

  const addProduct = useCallback(
    async (product: CartProductSnapshot, quantity: number) => {
      if (!authReady) {
        return { ok: false, message: "Keranjang sedang disiapkan. Coba lagi." };
      }
      const productId = product.id;
      const existing = (
        userId ? accountItemsRef.current : useGuestCartStore.getState().items
      ).find((item) => item.productId === productId);
      const previousQuantity = existing?.quantity ?? 0;
      const nextQuantity = Math.min(
        99,
        previousQuantity + quantity,
        product.stock,
      );
      if (nextQuantity <= previousQuantity) {
        const message =
          "Stok tidak cukup. Keranjang sudah mencapai jumlah yang tersedia.";
        setNotice(message);
        return { ok: false, message };
      }

      setProducts((current) => ({ ...current, [productId]: product }));
      if (userId) {
        setAccountItem(productId, { productId, quantity: nextQuantity });
      } else {
        useGuestCartStore
          .getState()
          .addItem(productId, quantity, product.stock);
      }

      const limitedByStock = nextQuantity < previousQuantity + quantity;
      const message = limitedByStock
        ? "Stok tidak cukup. Jumlah di keranjang disesuaikan dengan stok terbaru."
        : "Produk ditambahkan ke keranjang.";
      setNotice(limitedByStock ? message : null);

      if (!userId) return { ok: !limitedByStock, message };

      const version = nextMutationVersion(productId);
      try {
        const result = await addToCart({ productId, quantity });
        if (!result.ok) {
          if (mutationVersions.current.get(productId) === version) {
            setAccountItem(productId, existing ?? null);
            setNotice(result.message);
          }
          return { ok: false, message: result.message };
        }

        if (mutationVersions.current.get(productId) === version) {
          setAccountItem(
            productId,
            result.items.find((item) => item.productId === productId) ?? null,
          );
          setNotice(cartNotice(result));
        }

        return result.adjustedProductIds?.includes(productId)
          ? {
              ok: false,
              message:
                "Stok tidak cukup. Jumlah di keranjang disesuaikan dengan stok terbaru.",
            }
          : { ok: true };
      } catch (error) {
        if (mutationVersions.current.get(productId) === version) {
          setAccountItem(productId, existing ?? null);
          setNotice("Produk belum berhasil ditambahkan ke keranjang.");
        }
        console.error("Produk belum berhasil ditambahkan ke keranjang.", error);
        return {
          ok: false,
          message: "Produk belum berhasil ditambahkan ke keranjang.",
        };
      }
    },
    [authReady, nextMutationVersion, setAccountItem, userId],
  );

  const deleteItem = useCallback(
    async (productId: string): Promise<CartOperationResult> => {
      if (userId) {
        const existing =
          accountItemsRef.current.find(
            (item) => item.productId === productId,
          ) ?? null;
        const version = nextMutationVersion(productId);
        const timer = quantityTimers.current.get(productId);
        if (timer !== undefined) {
          window.clearTimeout(timer);
          quantityTimers.current.delete(productId);
          quantitySnapshots.current.delete(productId);
        }
        setAccountItem(productId, null);
        try {
          const result = await removeItem({ productId });
          if (!result.ok) {
            if (mutationVersions.current.get(productId) === version) {
              setAccountItem(productId, existing);
              setNotice(result.message);
              showCartToast(result.message);
            }
            return { ok: false, message: result.message };
          }
          setNotice(null);
          return { ok: true };
        } catch (error) {
          if (mutationVersions.current.get(productId) === version) {
            setAccountItem(productId, existing);
          }
          const message = "Produk belum berhasil dihapus dari keranjang.";
          setNotice(message);
          showCartToast(message);
          console.error(message, error);
          return { ok: false, message };
        }
      }

      useGuestCartStore.getState().removeItem(productId);
      setNotice("Produk dihapus dari keranjang.");
      return { ok: true };
    },
    [nextMutationVersion, setAccountItem, showCartToast, userId],
  );

  const changeQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity < 1) return deleteItem(productId);
      if (userId) {
        const product = products[productId];
        if (!product || product.stock < 1) {
          const message = "Stok produk habis. Hapus produk dari keranjang.";
          setNotice(message);
          return { ok: false, message };
        }

        const current =
          accountItemsRef.current.find(
            (item) => item.productId === productId,
          ) ?? null;
        if (!quantitySnapshots.current.has(productId)) {
          quantitySnapshots.current.set(productId, current);
        }

        const clampedQuantity = Math.min(quantity, product.stock, 99);
        setAccountItem(productId, { productId, quantity: clampedQuantity });
        const version = nextMutationVersion(productId);
        const existingTimer = quantityTimers.current.get(productId);
        if (existingTimer !== undefined) window.clearTimeout(existingTimer);

        const timer = window.setTimeout(async () => {
          quantityTimers.current.delete(productId);
          try {
            const result = await updateQuantity({
              productId,
              quantity: clampedQuantity,
            });
            if (mutationVersions.current.get(productId) !== version) return;
            if (!result.ok) {
              setAccountItem(
                productId,
                quantitySnapshots.current.get(productId) ?? null,
              );
              setNotice(result.message);
              showCartToast(result.message);
              return;
            }
            setAccountItem(
              productId,
              result.items.find((item) => item.productId === productId) ?? null,
            );
            setNotice(
              result.adjustedProductIds?.includes(productId)
                ? "Jumlah disesuaikan dengan stok terbaru."
                : null,
            );
          } catch (error) {
            if (mutationVersions.current.get(productId) === version) {
              setAccountItem(
                productId,
                quantitySnapshots.current.get(productId) ?? null,
              );
              setNotice("Jumlah produk belum berhasil diperbarui.");
              showCartToast("Jumlah produk belum berhasil diperbarui.");
            }
            console.error("Jumlah produk belum berhasil diperbarui.", error);
          } finally {
            if (mutationVersions.current.get(productId) === version) {
              quantitySnapshots.current.delete(productId);
            }
          }
        }, 300);
        quantityTimers.current.set(productId, timer);
        return { ok: true };
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
    [
      deleteItem,
      nextMutationVersion,
      products,
      setAccountItem,
      showCartToast,
      userId,
    ],
  );

  const itemsValue = useMemo<CartItemsValue>(
    () => ({
      items,
      subtotal,
      totalCo2eKg,
      totalPlasticAvoidedG,
      isReady: authReady && guestHydrated && hydrated,
      isSignedIn: Boolean(userId),
    }),
    [
      items,
      subtotal,
      totalCo2eKg,
      totalPlasticAvoidedG,
      authReady,
      guestHydrated,
      hydrated,
      userId,
    ],
  );
  const headerValue = useMemo<CartHeaderValue>(
    () => ({
      itemCount,
      isCountReady: authReady && guestHydrated,
      setDrawerOpen,
    }),
    [itemCount, authReady, guestHydrated, setDrawerOpen],
  );
  const drawerValue = useMemo<CartDrawerValue>(
    () => ({ isDrawerOpen, notice, setDrawerOpen }),
    [isDrawerOpen, notice, setDrawerOpen],
  );
  const actionsValue = useMemo<CartActionsValue>(
    () => ({ addProduct, changeQuantity, deleteItem }),
    [addProduct, changeQuantity, deleteItem],
  );

  useEffect(
    () => () => {
      quantityTimers.current.forEach((timer) => window.clearTimeout(timer));
      quantityTimers.current.clear();
    },
    [],
  );

  return (
    <CartItemsContext.Provider value={itemsValue}>
      <CartHeaderContext.Provider value={headerValue}>
        <CartDrawerContext.Provider value={drawerValue}>
          <CartActionsContext.Provider value={actionsValue}>
            {children}
            {cartToast && (
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="fixed inset-x-4 top-20 z-[60] rounded-md border border-danger bg-paper-50 p-4 text-danger sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-96"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="flex min-w-0 items-start gap-2 text-sm font-medium">
                    <CircleAlert
                      className="mt-0.5 h-4 w-4 shrink-0"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    {cartToast}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCartToast(null)}
                    aria-label="Tutup pemberitahuan"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-paper-100"
                  >
                    <X
                      className="h-4 w-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            )}
          </CartActionsContext.Provider>
        </CartDrawerContext.Provider>
      </CartHeaderContext.Provider>
    </CartItemsContext.Provider>
  );
}

function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${name} harus digunakan di dalam CartProvider.`);
  }
  return value;
}

export function useCart(): CartContextValue {
  const items = useRequiredContext(CartItemsContext, "useCart");
  return {
    ...items,
    ...useRequiredContext(CartHeaderContext, "useCart"),
    ...useRequiredContext(CartDrawerContext, "useCart"),
    ...useRequiredContext(CartActionsContext, "useCart"),
  };
}

export function useCartItems(): CartItemsValue {
  return useRequiredContext(CartItemsContext, "useCartItems");
}

export function useCartHeader(): CartHeaderValue {
  return useRequiredContext(CartHeaderContext, "useCartHeader");
}

export function useCartDrawer(): CartDrawerValue {
  return useRequiredContext(CartDrawerContext, "useCartDrawer");
}

export function useCartActions(): CartActionsValue {
  return useRequiredContext(CartActionsContext, "useCartActions");
}
