import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Card skeleton */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          {/* Form fields */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Submit button */}
          <Skeleton className="h-10 w-full rounded-md" />

          {/* Link */}
          <Skeleton className="h-4 w-36 mx-auto" />
        </div>
      </div>
    </div>
  );
}
