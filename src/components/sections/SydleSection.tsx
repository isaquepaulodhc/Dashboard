import { BarChartCard, PieChartCard } from "@/components/cards/ChartCard";
import { KpiCard } from "@/components/cards/KpiCard";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { formatDays, formatPercent } from "@/lib/formatters";
import type { DashboardData } from "@/types/dashboard";

export function SydleSection({ data }: { data: DashboardData }) {
  return (
    <section className="dashboard-section" aria-labelledby="sydle">
      <SectionHeader
        id="sydle"
        title="Sydle"
        subtitle="Indicadores operacionais de demandas registradas no Sydle."
        source="Fonte: sydle.xlsx"
      />

      <div className="kpi-grid kpi-grid--compact">
        <KpiCard label="Demandas Sydle" value={data.sydle.total} description="Total do período" tone="orange" />
        <KpiCard label="Tempo médio" value={formatDays(data.sydle.tempoMedioResposta)} description="Resposta em dias" tone="success" />
        <KpiCard label="SLA médio" value={formatDays(data.sydle.slaMedio)} description="Prazo médio" />
        <KpiCard label="Dentro do SLA" value={formatPercent(data.sydle.percentualDentroSla)} description={`${data.sydle.dentroSla} dentro / ${data.sydle.foraSla} fora`} tone="success" />
      </div>

      <div className="chart-grid chart-grid--three">
        <BarChartCard title="Demandas por cliente" data={data.sydle.porCliente} />
        <PieChartCard title="Dentro/Fora do SLA" data={data.sydle.slaStatus} />
        <BarChartCard title="Tempo médio por cliente" data={data.sydle.porCliente} dataKey="tempoMedioResposta" valueKind="days" />
      </div>
    </section>
  );
}

