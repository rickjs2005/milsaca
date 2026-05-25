import {
  PageHeaderSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/skeleton";

export default function ProdutoresLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mb-6 rounded-card border border-slate-200 bg-white p-4 shadow-card">
        <Skeleton className="mb-3 h-9 w-full" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-pill" />
          ))}
        </div>
      </div>
      <TableSkeleton rows={8} cols={6} />
    </>
  );
}
