import {
  PageHeaderSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/skeleton";

export default function AuditoriaLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <Skeleton className="mb-6 h-20 w-full rounded-card" />
      <TableSkeleton rows={10} cols={5} />
    </>
  );
}
