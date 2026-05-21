import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeleton";

export default function PlanosLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <TableSkeleton rows={4} cols={5} />
    </>
  );
}
