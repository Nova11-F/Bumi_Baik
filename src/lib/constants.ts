export const CATEGORIES = [
  { slug: "energi-surya", name: "Energi Surya" },
  { slug: "dapur-bebas-plastik", name: "Dapur Bebas Plastik" },
  { slug: "perawatan-diri", name: "Perawatan Diri" },
  { slug: "fesyen-sirkular", name: "Fesyen Sirkular" },
  { slug: "berkebun", name: "Berkebun" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const SDG_GOALS = [
  {
    number: 7,
    name: "Energi Bersih & Terjangkau",
    role: "Produk tenaga surya dan hemat energi yang mengurangi listrik jaringan.",
  },
  {
    number: 12,
    name: "Konsumsi & Produksi Bertanggung Jawab",
    role: "Produk guna ulang, isi ulang, dan bebas plastik sekali pakai.",
  },
  {
    number: 13,
    name: "Penanganan Perubahan Iklim",
    role: "Setiap produk menampilkan estimasi CO₂e yang bisa dihindari.",
  },
  {
    number: 15,
    name: "Ekosistem Daratan",
    role: "Produk berkebun, kompos, dan bibit yang mendukung tanah hidup.",
  },
] as const;

export type SdgNumber = (typeof SDG_GOALS)[number]["number"];

export const SDG_GOAL_MAP = Object.fromEntries(
  SDG_GOALS.map((goal) => [goal.number, goal]),
) as Record<SdgNumber, (typeof SDG_GOALS)[number]>;

export const SHIPPING_ZONES = {
  jawa: { label: "Jawa", rateIdr: 20_000 },
  luarJawa: { label: "Luar Jawa", rateIdr: 35_000 },
} as const;

export const FREE_SHIPPING_MIN_IDR = 300_000;

export const PRODUCTS_PER_PAGE = 12;
