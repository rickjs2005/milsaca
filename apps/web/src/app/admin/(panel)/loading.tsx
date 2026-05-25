import {
  KpiGridSkeleton,
  PageHeaderSkeleton,
} from "@/components/skeleton";

/**
 * Skeleton fallback do /admin e descendentes que não definem o próprio
 * loading.tsx. Apenas PageHeader + KPI grid — neutro o suficiente pra
 * funcionar bem no dashboard, listas com filtros, ou formulários.
 */
export default function AdminLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <KpiGridSkeleton cols={4} />
    </>
  );
}
