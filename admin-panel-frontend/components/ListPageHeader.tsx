import { ReactNode } from "react";

interface ListPageHeaderProps {
  title: string;
  children: ReactNode; // Для кнопок и других действий
  className?: string;
}

export function ListPageHeader({
  title,
  children,
  className = "",
}: ListPageHeaderProps) {
  return (
    <div className={`w-full flex flex-wrap gap-2 justify-between ${className}`}>
      <h1 className="text-3xl w-2/4 font-bold">{title}</h1>
      <div className="flex gap-2">
        {children}
      </div>
    </div>
  );
}