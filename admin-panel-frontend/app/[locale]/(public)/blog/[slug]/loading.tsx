import { Skeleton } from "@/components/ui/skeleton";

export default function BlogPostLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-24" />

      {/* Article header */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Featured image */}
      <Skeleton className="h-64 w-full rounded-lg" />

      {/* Article body */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    </div>
  );
}
