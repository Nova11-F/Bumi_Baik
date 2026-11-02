import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: {
          code: "CRON_NOT_CONFIGURED",
          message: "Cron belum dikonfigurasi.",
        },
      },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Akses tidak diizinkan." } },
      { status: 401 },
    );
  }

  const { data, error } = await createAdminClient().rpc(
    "expire_pending_orders",
    { p_limit: 100 },
  );
  if (error) {
    console.error("Order expiration cron failed", error);
    return NextResponse.json(
      {
        error: {
          code: "ORDER_EXPIRATION_FAILED",
          message: "Pesanan belum berhasil diperbarui.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ expired: data });
}
