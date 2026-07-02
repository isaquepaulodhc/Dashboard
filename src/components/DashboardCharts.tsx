"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ChartPoint } from "@/types/dashboard";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";

const COLORS = ["#FF7A00", "#E86600", "#2B1605", "#F59E0B", "#6B7280", "#9CA3AF", "#16A34A", "#DC2626"];

interface BarChartCardProps {
  title: string;
  data: ChartPoint[];
  dataKey?: keyof ChartPoint;
  valueKind?: "number" | "currency" | "percent" | "days" | "ratio";
}

export function BarChartCard({ title, data, dataKey = "total", valueKind = "number" }: BarChartCardProps) {
  const hasData = data.some((point) => Number(point[dataKey] ?? 0) > 0);

  return (
    <article className="chart-card">
      <header>
        <h3>{title}</h3>
      </header>
      <div className="chart-frame">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 14, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#F1F2F4" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4B5563" }} interval={0} tickLine={false} minTickGap={10} />
              <YAxis tick={{ fontSize: 11, fill: "#4B5563" }} tickLine={false} axisLine={false} width={44} />
              <Tooltip formatter={(value) => formatChartValue(Number(value), valueKind)} labelStyle={{ color: "#111827" }} />
              <Bar dataKey={dataKey as string} fill="#FF7A00" radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">Sem dados para exibir</div>
        )}
      </div>
    </article>
  );
}

interface PieChartCardProps {
  title: string;
  data: ChartPoint[];
}

export function PieChartCard({ title, data }: PieChartCardProps) {
  const hasData = data.some((point) => Number(point.total ?? 0) > 0);

  return (
    <article className="chart-card">
      <header>
        <h3>{title}</h3>
      </header>
      <div className="chart-frame chart-frame--pie">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2}>
                {data.map((_, index) => (
                  <Cell key={`slice-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(Number(value))} labelStyle={{ color: "#20242c" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">Sem dados para exibir</div>
        )}
      </div>
      <div className="legend-list">
        {data.map((point, index) => (
          <span key={point.name}>
            <i style={{ background: COLORS[index % COLORS.length] }} />
            {point.name}: {formatNumber(point.total)}
          </span>
        ))}
      </div>
    </article>
  );
}

function formatChartValue(value: number, valueKind: BarChartCardProps["valueKind"]) {
  if (valueKind === "currency") {
    return formatCurrency(value);
  }

  if (valueKind === "percent") {
    return formatPercent(value);
  }

  if (valueKind === "ratio") {
    return formatPercent(value * 100);
  }

  if (valueKind === "days") {
    return `${formatNumber(value)} dias`;
  }

  return formatNumber(value);
}
