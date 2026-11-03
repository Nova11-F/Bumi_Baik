import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const supabase = await createServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("slug, created_at")
    .eq("is_active", true);

  if (error) {
    throw new Error("Sitemap produk belum berhasil dimuat.", { cause: error });
  }

  const staticRoutes = [
    "",
    "/produk",
    "/dampak",
    "/kebijakan-privasi",
    "/syarat-ketentuan",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...(products ?? []).map((product) => ({
      url: `${siteUrl}/produk/${product.slug}`,
      lastModified: product.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
