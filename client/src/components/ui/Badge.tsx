import { ReactNode } from "react";

type Color = "green" | "yellow" | "amber" | "blue" | "gray" | "red" | "purple";

const COLORS: Record<Color, string> = {
  green: "bg-green-100 text-green-800",
  // GP / currency always uses the warm amber accent.
  amber: "bg-amber-100 text-amber-700",
  yellow: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  gray: "bg-gray-100 text-gray-600",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
};

export default function Badge({
  color = "gray",
  children,
  className = "",
}: {
  color?: Color;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${COLORS[color]} ${className}`}
    >
      {children}
    </span>
  );
}
