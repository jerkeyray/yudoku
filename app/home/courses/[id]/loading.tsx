import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <div className="bg-background h-full">
        <main className="container h-full pt-6 pb-6 px-4 lg:px-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 h-full">
            {/* Course Player Skeleton */}
            <div className="lg:col-span-8 h-full flex flex-col gap-4">
              <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden">
                <Skeleton className="w-full h-full bg-muted" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4 bg-muted" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32 bg-muted" />
                  <Skeleton className="h-4 w-24 bg-muted" />
                </div>
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="lg:col-span-4 h-full">
              <div className="bg-muted/50 border border-border rounded-xl h-full flex flex-col">
                <div className="p-4 border-b border-border space-y-4">
                  <Skeleton className="h-6 w-1/2 bg-muted" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-20 bg-muted" />
                      <Skeleton className="h-3 w-10 bg-muted" />
                    </div>
                    <Skeleton className="h-1.5 w-full bg-muted rounded-full" />
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-4 space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-16 w-28 rounded-md bg-muted shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full bg-muted" />
                        <Skeleton className="h-3 w-1/2 bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
