export type StockStatus = "habis" | "menipis" | "tersedia";

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "habis";
  if (stock <= 5) return "menipis";
  return "tersedia";
}

export function stockLabel(stock: number): string {
  const status = getStockStatus(stock);
  if (status === "habis") return "Stok habis";
  if (status === "menipis") return `Stok menipis · sisa ${stock}`;
  return "Tersedia";
}
