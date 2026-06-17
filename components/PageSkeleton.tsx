import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({
  titleWidth = "w-36",
  cards = 3,
}: {
  titleWidth?: string;
  cards?: number;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-8 md:p-12">
        <div className="max-w-6xl space-y-10">
          <div className="space-y-3">
            <Skeleton className={`h-7 ${titleWidth} bg-muted`} />
            <Skeleton className="h-4 w-64 bg-muted" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: cards }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-card p-6"
              >
                <Skeleton className="mb-5 h-5 w-4/5 bg-muted" />
                <Skeleton className="mb-3 h-3 w-24 bg-muted" />
                <Skeleton className="mb-6 h-2 w-full bg-muted" />
                <Skeleton className="h-9 w-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
