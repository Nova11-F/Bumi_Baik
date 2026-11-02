import { SDG_GOAL_MAP } from "@/lib/constants";
import type { SdgNumber } from "@/lib/constants";

type SdgTagProps = {
  goal: number;
};

function isSdgNumber(value: number): value is SdgNumber {
  return value === 7 || value === 12 || value === 13 || value === 15;
}

export function SdgTag({ goal }: SdgTagProps) {
  const info = isSdgNumber(goal) ? SDG_GOAL_MAP[goal] : null;
  const label = info ? `SDG ${goal}: ${info.name}` : `SDG ${goal}`;

  return (
    <span
      title={info?.name ?? label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-forest-700 font-mono text-sm text-forest-700"
    >
      {goal}
    </span>
  );
}
