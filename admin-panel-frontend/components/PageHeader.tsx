import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  children?: ReactNode;
  variant?: "default" | "create" | "list";
  className?: string;
};

export default function PageHeader({
  title,
  children,
  variant = "default",
  className = "",
}: PageHeaderProps) {

  const containerClasses = {
    default: "flex flex-wrap items-center justify-between w-full gap-2",
    create: "flex flex-wrap gap-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0",
    list: `w-full flex flex-wrap gap-2 justify-between ${className}`,
  };


  const titleClasses = {
    default: "text-3xl font-bold",
    create: "text-3xl font-bold sm:w-auto w-full",
    list: "text-3xl w-2/4 font-bold",
  };


  const childrenContainerClasses = {
    default: "flex flex-wrap gap-4",
    create: "flex flex-wrap gap-4",
    list: "flex gap-2",
  };

  return (
    <div className={containerClasses[variant]}>
      <h1 className={titleClasses[variant]}>{title}</h1>
      <div className={childrenContainerClasses[variant]}>
        {children}
      </div>
    </div>
  );
}