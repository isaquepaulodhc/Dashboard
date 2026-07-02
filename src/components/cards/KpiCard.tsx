import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  tone?: "neutral" | "orange" | "success" | "warning" | "danger";
}

export function KpiCard({ label, value, description, icon, tone = "neutral" }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__top">
        <span>{label}</span>
        {icon ? <i>{icon}</i> : null}
      </div>
      <strong>{value}</strong>
      {description ? <small>{description}</small> : null}
    </article>
  );
}
