import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  children?: ReactNode;
  variant?: "default" | "create";
};

export default function PageHeader({ title, children, variant = "default" }: PageHeaderProps) {
  const baseClasses = "flex flex-wrap items-center justify-between w-full gap-2";
  const createClasses = "gap-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0";

  return (
    <div className={variant === "create" ? `${baseClasses} ${createClasses}` : baseClasses}>
      <h1 className={`text-3xl font-bold ${variant === "create" ? "sm:w-auto w-full" : ""}`}>
        {title}
      </h1>
      <div className={`flex flex-wrap ${variant === "create" ? "gap-4" : "gap-2"}`}>
        {children}
      </div>
    </div>
  );
}