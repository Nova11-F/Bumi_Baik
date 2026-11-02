import Link from "next/link";
import { angka } from "@/lib/format";

type ImpactPanelProps = {
  co2eKg: number;
  plasticG: number;
  impactNote: string | null;
};

export function ImpactPanel({ co2eKg, plasticG, impactNote }: ImpactPanelProps) {
  return (
    <section
      aria-labelledby="panel-dampak"
      className="rounded-md border border-paper-200 bg-paper-100 p-4 lg:p-6"
    >
      <p id="panel-dampak" className="text-sm font-medium uppercase tracking-wide text-ink-600">
        Estimasi dampak per unit
      </p>

      <p className="mt-3 flex items-baseline gap-2 text-forest-900">
        <span className="font-display text-[40px] leading-none">−{angka(co2eKg)}</span>
        <span className="font-mono text-sm">kg CO₂e</span>
      </p>

      {plasticG > 0 && (
        <p className="mt-2 font-mono text-sm text-forest-700">
          {angka(plasticG / 1000)} kg plastik dihindari
        </p>
      )}

      {impactNote && (
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-600">{impactNote}</p>
      )}

      <Link
        href="/dampak"
        className="mt-4 inline-block text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
      >
        Bagaimana kami menghitung
      </Link>
    </section>
  );
}
