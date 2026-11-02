import { NextResponse } from "next/server";
import { z } from "zod";
import { searchProducts } from "@/lib/catalog-query";

const querySchema = z.string().trim().min(1).max(120);

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(url.searchParams.get("q") ?? "");

  if (!parsed.success) {
    return NextResponse.json({ products: [] }, { headers: CACHE_HEADERS });
  }

  try {
    const products = await searchProducts(parsed.data, 5);
    return NextResponse.json({ products }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SEARCH_FAILED",
          message: "Pencarian sedang tidak tersedia. Coba lagi sebentar.",
        },
      },
      { status: 500 },
    );
  }
}
