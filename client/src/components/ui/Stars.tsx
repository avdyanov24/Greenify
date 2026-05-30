import { Star } from "lucide-react";

/**
 * Star rating — display mode (readOnly) or interactive (pass onChange).
 */
export default function Stars({
  value,
  onChange,
  size = 16,
  showValue = false,
}: {
  value: number | null | undefined;
  onChange?: (v: number) => void;
  size?: number;
  showValue?: boolean;
}) {
  const v = value ?? 0;
  const interactive = !!onChange;

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          onClick={interactive ? () => onChange!(n) : undefined}
          className={`${n <= Math.round(v) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} ${
            interactive ? "cursor-pointer hover:scale-110 transition" : ""
          }`}
        />
      ))}
      {showValue && value != null && <span className="ml-1 text-sm text-gray-600">{v.toFixed(1)}</span>}
    </span>
  );
}
