"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShowScheduledToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
};

export default function ShowScheduledToggle({
  checked,
  onCheckedChange,
  label,
  className,
  disabled,
}: ShowScheduledToggleProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(Boolean(next))}
      disabled={disabled}
      className={cn(
        "group",
        buttonVariants({ variant: "outline", size: "default" }),
        "gap-2",
        "data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground",
        className
      )}
      aria-label={label}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input bg-background text-foreground",
          "group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground"
        )}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Check className="h-3 w-3" />
        </CheckboxPrimitive.Indicator>
      </span>

      <span className="whitespace-nowrap">{label}</span>
    </CheckboxPrimitive.Root>
  );
}
