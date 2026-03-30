import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar skeleton */}
      <div className="fixed top-0 bottom-0 left-0 z-20 hidden md:block border-r bg-muted/40 w-[220px] lg:w-[280px]">
        <div className="flex flex-col gap-2 h-[100dvh]">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-32 ml-2" />
          </div>
          <div className="flex-1 px-2 lg:px-4 pt-2">
            <nav className="grid gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-[220px] lg:ml-[280px]">
        {/* Header skeleton */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:h-[60px] lg:px-6">
          <Skeleton className="h-9 w-9 rounded-md md:hidden" />
          <Skeleton className="h-9 w-9 rounded-md hidden md:block" />
          <div className="flex gap-2 ml-auto">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>

        {/* Content skeleton */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-6 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
