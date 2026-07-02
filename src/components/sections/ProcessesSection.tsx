import { BarChartCard } from "@/components/cards/ChartCard";
import { KpiCard } from "@/components/cards/KpiCard";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { formatCurrency } from "@/lib/formatters";
import type { DashboardData } from "@/types/dashboard";

export function ProcessesSection({ data }: { data: DashboardData }) {
  const summary = data.executiveSummary;

  return (
    <section className="dashboard-section" aria-labelledby="processos">
      <SectionHeader
        id="processos"
        title="Processos"
        subtitle="Análise dos processos acompanhados, valores envolvidos, status e casos de maior relevância."
        source="Fonte: processos.xlsx"
      />

      <div className="kpi-grid kpi-grid--compact">
        <KpiCard label="Total" value={summary.totalProcessos} description="Processos na base" tone="orange" />
        <KpiCard label="Ativos" value={summary.processosAtivos} description="Não extintos ou arquivados" tone="success" />
        <KpiCard label="Encerrados" value={summary.processosEncerrados} description="Extintos ou arquivados" />
        <KpiCard label="Valor de causa" value={formatCurrency(summary.valorTotalCausa)} description="Total monitorado" tone="warning" />
      </div>

      <div className="chart-grid">
        <BarChartCard title="Processos por status" data={data.processos.byStatus} />
        <BarChartCard title="Processos por assunto" data={data.processos.byAssunto} />
        <BarChartCard title="Processos por comarca" data={data.processos.byComarca} />
        <BarChartCard title="Sentenças por resultado" data={data.processos.bySentenca} />
        <BarChartCard title="Valor de causa por assunto" data={data.processos.valorPorAssunto} dataKey="value" valueKind="currency" />
        <BarChartCard title="Valor de causa por comarca" data={data.processos.valorPorComarca} dataKey="value" valueKind="currency" />
      </div>
    </section>
  );
}

