const SIZES: Record<string, string> = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-16 h-16 text-2xl",
  xl: "w-24 h-24 text-3xl",
};

export default function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const initial = (name || "U").trim().charAt(0).toUpperCase() || "U";

  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className={`${SIZES[size]} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZES[size]} rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}
