import { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-4">
      {icon && <div className="text-gray-300 mb-4 flex justify-center">{icon}</div>}
      <p className="text-gray-700 text-lg font-medium">{title}</p>
      {description && <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
