import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeleton";

export default function AssinaturasLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} cols={5} />
    </>
  );
}
