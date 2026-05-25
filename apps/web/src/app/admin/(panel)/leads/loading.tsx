import {
  KpiGridSkeleton,
  PageHeaderSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/skeleton";

export default function LeadsLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mb-8">
        <KpiGridSkeleton cols={4} />
      </div>
      <Skeleton className="mb-6 h-20 w-full rounded-card" />
      <TableSkeleton rows={8} cols={5} />
    </>
  );
}
