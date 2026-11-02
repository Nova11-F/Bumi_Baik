export type CartQuantity = {
  productId: string;
  quantity: number;
};

export type CartMergeResult = {
  items: CartQuantity[];
  adjustedProductIds: string[];
  unavailableProductIds: string[];
};

export function clampCartQuantity(quantity: number, stock: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(stock) || stock <= 0) {
    return 0;
  }

  return Math.min(99, Math.max(0, Math.trunc(quantity)), Math.trunc(stock));
}

export function mergeCartQuantities(
  existingItems: CartQuantity[],
  guestItems: CartQuantity[],
  stockByProductId: ReadonlyMap<string, number>,
): CartMergeResult {
  const quantities = new Map<string, number>();

  for (const item of existingItems) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }

  for (const item of guestItems) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const items: CartQuantity[] = [];
  const adjustedProductIds: string[] = [];
  const unavailableProductIds: string[] = [];

  for (const [productId, requestedQuantity] of quantities) {
    const stock = stockByProductId.get(productId) ?? 0;
    const quantity = clampCartQuantity(requestedQuantity, stock);

    if (quantity === 0) {
      unavailableProductIds.push(productId);
      continue;
    }

    if (quantity < requestedQuantity) {
      adjustedProductIds.push(productId);
    }

    items.push({ productId, quantity });
  }

  return { items, adjustedProductIds, unavailableProductIds };
}
