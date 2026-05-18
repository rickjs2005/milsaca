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

const COLORS = {
  slate900: "#0f172a",
  slate500: "#64748b",
  slate200: "#e2e8f0",
  dourado: "#C9A961",
  verde: "#2D3A2E",
  blue: "#0284c7",
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
};

const STATUS_COLOR: Record<string, string> = {
  trial: COLORS.blue,
  active: COLORS.emerald,
  past_due: COLORS.amber,
  canceled: COLORS.slate500,
  expired: COLORS.rose,
};

const STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Ativa",
  past_due: "Vencida",
  canceled: "Cancelada",
  expired: "Expirada",
};

const tooltipStyle = {
  background: "white",
  border: `1px solid ${COLORS.slate200}`,
  borderRadius: 8,
  fontSize: 12,
  padding: "6px 10px",
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function MonthlyBarChart({
  data,
  color = COLORS.dourado,
  unit = "",
}: {
  data: { label: string; value: number }[];
  color?: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate200} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: COLORS.slate500 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: COLORS.slate500 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`${toNumber(v)}${unit}`, "Total"]}
        />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyLineChart({
  data,
  color = COLORS.blue,
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate200} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: COLORS.slate500 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: COLORS.slate500 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [toNumber(v), "Total"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const filtered = data.filter((d) => d.count > 0);
  if (filtered.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        Sem assinaturas ainda.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered.map((d) => ({
            name: STATUS_LABEL[d.status] ?? d.status,
            value: d.count,
            color: STATUS_COLOR[d.status] ?? COLORS.slate500,
          }))}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {filtered.map((d, i) => (
            <Cell
              key={i}
              fill={STATUS_COLOR[d.status] ?? COLORS.slate500}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [toNumber(v), "Corretoras"]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
