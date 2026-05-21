import {
  KpiGridSkeleton,
  PageHeaderSkeleton,
  Skeleton,
} from "@/components/skeleton";

export default function MetricasLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mb-8">
        <KpiGridSkeleton cols={3} />
      </div>
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border border-slate-200 bg-white p-6 shadow-card"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-1 h-2.5 w-32" />
            <Skeleton className="mt-4 h-48 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}
