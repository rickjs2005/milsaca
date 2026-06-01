"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney0 } from "@/lib/format";

const MILSACA_VERDE = "#2D3A2E";
const MILSACA_DOURADO = "#C9A961";
const MILSACA_CREAM_ESCURO = "#EFEADB";
const MILSACA_ROSE = "#e11d48";
const MILSACA_EMERALD = "#059669";
const MILSACA_SKY = "#0284c7";

const tooltipStyle = {
  background: "white",
  border: `1px solid ${MILSACA_CREAM_ESCURO}`,
  borderRadius: 12,
  fontSize: 12,
  padding: "8px 12px",
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function LeadsPorMesChart({
  data,
}: {
  data: { mes: string; valor: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={MILSACA_CREAM_ESCURO} vertical={false} />
        <XAxis
          dataKey="mes"
          axisLine={false}
          tickLine={false}
          tick={{ fill: MILSACA_VERDE, fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: MILSACA_VERDE, fontSize: 11 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: MILSACA_CREAM_ESCURO, opacity: 0.4 }}
          formatter={(v) => [toNumber(v), "leads"]}
        />
        <Bar dataKey="valor" fill={MILSACA_DOURADO} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComissaoAcumuladaChart({
  data,
}: {
  data: { mes: string; valor: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={MILSACA_CREAM_ESCURO} vertical={false} />
        <XAxis
          dataKey="mes"
          axisLine={false}
          tickLine={false}
          tick={{ fill: MILSACA_VERDE, fontSize: 11 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: MILSACA_VERDE, fontSize: 11 }}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtMoney0(toNumber(v)), "comissão"]}
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke={MILSACA_VERDE}
          strokeWidth={2.5}
          dot={{ fill: MILSACA_DOURADO, strokeWidth: 0, r: 4 }}
          activeDot={{ fill: MILSACA_DOURADO, strokeWidth: 0, r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function FunilLeadsChart({
  data,
}: {
  data: { status: string; label: string; count: number }[];
}) {
  const FUNIL_COLORS: Record<string, string> = {
    novo: MILSACA_SKY,
    em_negociacao: MILSACA_DOURADO,
    convertido: MILSACA_EMERALD,
    perdido: MILSACA_ROSE,
    arquivado: "#94a3b8",
  };
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
      >
        <CartesianGrid stroke={MILSACA_CREAM_ESCURO} horizontal={false} />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fill: MILSACA_VERDE, fontSize: 11 }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={false}
          tickLine={false}
          width={110}
          tick={{ fill: MILSACA_VERDE, fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: MILSACA_CREAM_ESCURO, opacity: 0.4 }}
          formatter={(v) => [toNumber(v), "leads"]}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((d) => (
            <Cell key={d.status} fill={FUNIL_COLORS[d.status] ?? MILSACA_DOURADO} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MixCafeChart({
  data,
}: {
  data: { specie: string; label: string; sacas: number }[];
}) {
  const COLORS: Record<string, string> = {
    arabica: MILSACA_VERDE,
    conillon: MILSACA_DOURADO,
  };
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, _name, p) => {
            const payload = (p as { payload?: { label?: string } } | undefined)
              ?.payload;
            return [`${toNumber(v)} sacas`, payload?.label ?? ""];
          }}
        />
        <Pie
          data={data}
          dataKey="sacas"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.specie} fill={COLORS[d.specie] ?? MILSACA_DOURADO} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
