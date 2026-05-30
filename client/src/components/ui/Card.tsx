import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  padding = "md",
  hover = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${PADDING[padding]} ${hover ? "hover:shadow-md transition cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
