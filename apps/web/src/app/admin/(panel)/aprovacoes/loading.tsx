import { PageHeaderSkeleton, Skeleton } from "@/components/skeleton";

export default function AprovacoesLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border border-slate-200 bg-white p-6 shadow-card"
          >
            <div className="border-b border-slate-100 pb-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="mt-2 h-2.5 w-72" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-48" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
