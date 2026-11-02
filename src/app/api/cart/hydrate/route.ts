import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  productIds: z.array(z.string().uuid()).max(100),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Format permintaan tidak valid." } },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_CART", message: "Daftar produk tidak valid." } },
      { status: 400 },
    );
  }

  if (parsed.data.productIds.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, price_idr, stock, co2e_avoided_kg, plastic_avoided_g, images",
    )
    .in("id", [...new Set(parsed.data.productIds)])
    .eq("is_active", true);

  if (error) {
    return NextResponse.json(
      { error: { code: "CART_HYDRATE_FAILED", message: "Produk belum berhasil dimuat." } },
      { status: 500 },
    );
  }

  return NextResponse.json({ products: data ?? [] });
}
