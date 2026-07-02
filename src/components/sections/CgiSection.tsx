import { BarChartCard, PieChartCard } from "@/components/cards/ChartCard";
import { KpiCard } from "@/components/cards/KpiCard";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { formatCurrency, formatDays, formatPercent } from "@/lib/formatters";
import type { DashboardData } from "@/types/dashboard";

export function CgiSection({ data }: { data: DashboardData }) {
  return (
    <section className="dashboard-section" aria-labelledby="cgi">
      <SectionHeader
        id="cgi"
        title="CGI"
        subtitle="Indicadores de demandas CGI, SLA, tempo de resposta e valores das operações."
        source="Fonte: cgi.xlsx"
      />

      <div className="kpi-grid kpi-grid--compact">
        <KpiCard label="Demandas CGI" value={data.cgi.total} description="Total do período" tone="orange" />
        <KpiCard label="Tempo médio" value={formatDays(data.cgi.tempoMedioResposta)} description="Resposta em dias" tone="success" />
        <KpiCard label="SLA médio" value={formatDays(data.cgi.slaMedio)} description="Prazo médio" />
        <KpiCard label="Dentro do SLA" value={formatPercent(data.cgi.percentualDentroSla)} description={`${data.cgi.dentroSla} dentro / ${data.cgi.foraSla} fora`} tone="success" />
        <KpiCard label="Valor dos imóveis" value={formatCurrency(data.cgi.valorTotalImoveis)} description="Total informado" tone="warning" />
        <KpiCard label="Valor das operações" value={formatCurrency(data.cgi.valorTotalOperacoes)} description="Total informado" tone="warning" />
        <KpiCard label="LTV médio" value={formatPercent((data.cgi.ltvMedio ?? 0) * 100)} description="Operação sobre imóvel" />
      </div>

      <div className="chart-grid">
        <BarChartCard title="Demandas por cliente" data={data.cgi.porCliente} />
        <PieChartCard title="Dentro/Fora do SLA" data={data.cgi.slaStatus} />
        <BarChartCard title="Tempo médio por cliente" data={data.cgi.porCliente} dataKey="tempoMedioResposta" valueKind="days" />
        <BarChartCard title="Valor de operação por cliente" data={data.cgi.porCliente} dataKey="valorTotalOperacoes" valueKind="currency" />
        <BarChartCard title="Valor de imóvel por cliente" data={data.cgi.porCliente} dataKey="valorTotalImoveis" valueKind="currency" />
        <BarChartCard title="LTV médio por cliente" data={data.cgi.porCliente} dataKey="ltvMedio" valueKind="ratio" />
      </div>
    </section>
  );
}

