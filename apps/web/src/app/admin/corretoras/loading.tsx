import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeleton";

export default function CorretorasLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </>
  );
}
