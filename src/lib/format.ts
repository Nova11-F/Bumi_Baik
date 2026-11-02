const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const tanggalFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const angkaFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

export function rupiah(value: number): string {
  return rupiahFormatter.format(value).replace(/\u00a0/g, " ");
}

export function tanggal(value: Date | string | number): string {
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  return tanggalFormatter.format(date);
}

export function angka(value: number): string {
  return angkaFormatter.format(value);
}

export function co2e(value: number): string {
  return `−${angka(value)} kg CO₂e`;
}
