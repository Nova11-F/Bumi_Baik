import { cache } from "react";
import { z } from "zod";
import {
  CATEGORIES,
  PRODUCTS_PER_PAGE,
  SDG_GOALS,
  type CategorySlug,
  type SdgNumber,
} from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import type { ProductListItem, ProductWithCategory } from "@/types";

const PRODUCT_LIST_SELECT =
  "id,slug,name,price_idr,stock,co2e_avoided_kg,plastic_avoided_g,sdg_goals,images,categories(slug,name)";

const CATALOG_PRODUCT_SELECT =
  "id,slug,name,price_idr,stock,co2e_avoided_kg,plastic_avoided_g,sdg_goals,images,categories!inner(slug,name)";

const pageSchema = z.coerce.number().int().min(1).catch(1);

export const CATALOG_SORTS = ["terbaru", "murah", "mahal", "dampak"] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export type CatalogParams = {
  q: string;
  kategori: CategorySlug[];
  sdg: SdgNumber[];
  hargaMin: number | null;
  hargaMax: number | null;
  tersedia: boolean;
  urut: CatalogSort;
  hal: number;
};

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

export type HomeProduct = ProductListItem & { is_featured: boolean };

export type CatalogPage = {
  products: ProductListItem[];
  total: number;
  page: number;
  pageCount: number;
};

const querySchema = z.string().trim().max(120).catch("");
const sortSchema = z.enum(CATALOG_SORTS).catch("terbaru");
const priceSchema = z.coerce.number().int().min(0).max(1_000_000_000);
const availableSchema = z.enum(["1", "0", "true", "false"]).catch("0");

const CATEGORY_SLUGS = new Set<string>(
  CATEGORIES.map((category) => category.slug),
);
const SDG_NUMBERS = new Set<number>(SDG_GOALS.map((goal) => goal.number));
const MAX_SEARCH_TOKENS = 8;
const MAX_SEARCH_TOKEN_LENGTH = 40;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function splitList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function parsePrice(value: string | string[] | undefined): number | null {
  const raw = firstValue(value);
  if (!raw || raw.trim() === "") return null;

  const parsed = priceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function parseCategories(value: string | string[] | undefined): CategorySlug[] {
  return unique(
    splitList(value).filter((slug) => CATEGORY_SLUGS.has(slug)),
  ) as CategorySlug[];
}

function parseSdg(value: string | string[] | undefined): SdgNumber[] {
  return unique(
    splitList(value)
      .map((item) => Number(item))
      .filter(
        (item): item is SdgNumber =>
          Number.isInteger(item) && SDG_NUMBERS.has(item),
      ),
  );
}

export function parseCatalogPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return pageSchema.parse(raw);
}

export function parseCatalogParams(
  searchParams: CatalogSearchParams,
): CatalogParams {
  const available = availableSchema.parse(firstValue(searchParams.tersedia));

  return {
    q: querySchema.parse(firstValue(searchParams.q)),
    kategori: parseCategories(searchParams.kategori),
    sdg: parseSdg(searchParams.sdg),
    hargaMin: parsePrice(searchParams.harga_min),
    hargaMax: parsePrice(searchParams.harga_max),
    tersedia: available === "1" || available === "true",
    urut: sortSchema.parse(firstValue(searchParams.urut)),
    hal: parseCatalogPage(searchParams.hal),
  };
}

function toSearchTokens(input: string): string[] {
  return unique(
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.slice(0, MAX_SEARCH_TOKEN_LENGTH)),
  ).slice(0, MAX_SEARCH_TOKENS);
}

export function toTsQuery(input: string): string {
  return toSearchTokens(input)
    .map((token) => `${token}:*`)
    .join(" & ");
}

function toIlikeTerm(input: string): string {
  return toSearchTokens(input).join(" ");
}

function toIlikeFilter(input: string, categoryIds: number[] = []): string {
  const term = toIlikeTerm(input);
  const filters = [`name.ilike.%${term}%`, `description.ilike.%${term}%`];

  if (categoryIds.length > 0) {
    filters.push(`category_id.in.(${categoryIds.join(",")})`);
  }

  return filters.join(",");
}

async function findCategoryIds(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  input: string,
): Promise<number[]> {
  const term = toIlikeTerm(input);
  if (!term) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .or(`name.ilike.%${term}%,slug.ilike.%${term}%`)
    .limit(20);

  if (error) return [];

  return (data ?? []).map((category) => category.id as number);
}

function emptyCatalogPage(page: number): CatalogPage {
  return { products: [], total: 0, page, pageCount: 1 };
}

export async function queryProducts(
  params: CatalogParams,
): Promise<CatalogPage> {
  if (params.q && !toTsQuery(params.q)) {
    return emptyCatalogPage(params.hal);
  }

  const result = await runCatalogQuery(params, false);

  if (params.q && result.total === 0 && toIlikeTerm(params.q)) {
    return runCatalogQuery(params, true);
  }

  return result;
}

async function runCatalogQuery(
  params: CatalogParams,
  useIlikeFallback: boolean,
): Promise<CatalogPage> {
  const supabase = await createServerClient();
  const from = (params.hal - 1) * PRODUCTS_PER_PAGE;

  let query = supabase
    .from("products")
    .select(CATALOG_PRODUCT_SELECT, { count: "exact" })
    .eq("is_active", true);

  if (params.q) {
    if (useIlikeFallback) {
      const categoryIds = await findCategoryIds(supabase, params.q);
      query = query.or(toIlikeFilter(params.q, categoryIds));
    } else {
      query = query.textSearch("search", toTsQuery(params.q), {
        config: "simple",
      });
    }
  }

  if (params.kategori.length > 0) {
    query = query.in("categories.slug", params.kategori);
  }

  if (params.sdg.length > 0) {
    query = query.overlaps("sdg_goals", params.sdg);
  }

  if (params.hargaMin !== null) {
    query = query.gte("price_idr", params.hargaMin);
  }

  if (params.hargaMax !== null) {
    query = query.lte("price_idr", params.hargaMax);
  }

  if (params.tersedia) {
    query = query.gt("stock", 0);
  }

  if (params.urut === "murah") {
    query = query.order("price_idr", { ascending: true });
  } else if (params.urut === "mahal") {
    query = query.order("price_idr", { ascending: false });
  } else if (params.urut === "dampak") {
    query = query.order("co2e_avoided_kg", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query
    .order("slug", { ascending: true })
    .range(from, from + PRODUCTS_PER_PAGE - 1)
    .returns<ProductListItem[]>();

  if (error) {
    throw new Error(`GAGAL_MEMUAT_KATALOG:${error.message}`);
  }

  const total = count ?? 0;

  return {
    products: data ?? [],
    total,
    page: params.hal,
    pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)),
  };
}

export async function searchProducts(
  term: string,
  limit = 5,
): Promise<ProductListItem[]> {
  const supabase = await createServerClient();
  const query = toTsQuery(term);

  if (query) {
    const { data, error } = await supabase
      .from("products")
      .select(CATALOG_PRODUCT_SELECT)
      .eq("is_active", true)
      .textSearch("search", query, { config: "simple" })
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<ProductListItem[]>();

    if (error) {
      throw new Error(`GAGAL_MENCARI_PRODUK:${error.message}`);
    }

    if (data && data.length > 0) {
      return data;
    }
  }

  const fallbackTerm = toIlikeTerm(term);
  if (!fallbackTerm) return [];

  const categoryIds = await findCategoryIds(supabase, term);
  const filter = toIlikeFilter(term, categoryIds);

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("products")
    .select(CATALOG_PRODUCT_SELECT)
    .eq("is_active", true)
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ProductListItem[]>();

  if (fallbackError) {
    throw new Error(`GAGAL_MENCARI_PRODUK:${fallbackError.message}`);
  }

  return fallbackData ?? [];
}

export async function getProductsPage(page: number): Promise<CatalogPage> {
  const supabase = await createServerClient();
  const from = (page - 1) * PRODUCTS_PER_PAGE;

  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_LIST_SELECT, { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .order("slug", { ascending: true })
    .range(from, from + PRODUCTS_PER_PAGE - 1)
    .returns<ProductListItem[]>();

  if (error) {
    throw new Error(`GAGAL_MEMUAT_KATALOG:${error.message}`);
  }

  const total = count ?? 0;

  return {
    products: data ?? [],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)),
  };
}

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductWithCategory | null> => {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("products")
      .select("*, categories(slug,name)")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`GAGAL_MEMUAT_PRODUK:${error.message}`);
    }

    return (data as ProductWithCategory | null) ?? null;
  },
);

export async function getRelatedProducts(
  categoryId: number,
  excludeId: string,
  limit = 4,
): Promise<ProductListItem[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_LIST_SELECT)
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ProductListItem[]>();

  if (error) {
    throw new Error(`GAGAL_MEMUAT_PRODUK_TERKAIT:${error.message}`);
  }

  return data ?? [];
}

export const getHomeProducts = cache(async (): Promise<HomeProduct[]> => {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(`${PRODUCT_LIST_SELECT},is_featured`)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<HomeProduct[]>();

  if (error) {
    throw new Error(`GAGAL_MEMUAT_BERANDA:${error.message}`);
  }

  return data ?? [];
});
