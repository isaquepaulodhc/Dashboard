import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: "neutral" | "green" | "gold" | "red" | "blue";
}

export function MetricCard({ label, value, detail, tone = "neutral" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

