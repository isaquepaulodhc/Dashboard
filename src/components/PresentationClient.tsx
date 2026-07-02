"use client";

import { CaseCard } from "@/components/cards/CaseCard";
import { BarChartCard, PieChartCard } from "@/components/cards/ChartCard";
import { KpiCard } from "@/components/cards/KpiCard";
import { PresentationHeader } from "@/components/presentation/PresentationHeader";
import { PresentationSlide } from "@/components/presentation/PresentationSlide";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency, formatDateTime, formatDays, formatPercent } from "@/lib/formatters";

export function PresentationClient() {
  const { data, loading, refreshing, refresh } = useDashboardData();

  if (loading && !data) {
    return (
      <main className="presentation-shell">
        <div className="loading-panel">Carregando apresentação...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="presentation-shell">
        <div className="error-panel">Não foi possível carregar a apresentação.</div>
      </main>
    );
  }

  const summary = data.executiveSummary;

  return (
    <main className="presentation-shell">
      <PresentationHeader refreshing={refreshing} onRefresh={() => void refresh()} />

      <PresentationSlide eyebrow="Slide 1" title="Dashboard Executivo Jurídico" subtitle="Apresentação mensal à diretoria" accent>
        <div className="cover-grid">
          <div>
            <span>Mês de referência</span>
            <strong>{data.referenceMonth}</strong>
          </div>
          <div>
            <span>Última atualização</span>
            <strong>{formatDateTime(data.lastUpdated)}</strong>
          </div>
        </div>
      </PresentationSlide>

      <PresentationSlide eyebrow="Slide 2" title="Visão Executiva" subtitle="Principais indicadores consolidados do mês.">
        <div className="presentation-kpis">
          <KpiCard label="Processos ativos" value={summary.processosAtivos} tone="success" />
          <KpiCard label="Valor total de causa" value={formatCurrency(summary.valorTotalCausa)} tone="warning" />
          <KpiCard label="CGI dentro do SLA" value={formatPercent(summary.percentualDentroSlaCgi)} tone="success" />
          <KpiCard label="Sydle dentro do SLA" value={formatPercent(summary.percentualDentroSlaSydle)} tone="success" />
        </div>
        <article className="presentation-summary">{data.executiveText}</article>
      </PresentationSlide>

      <PresentationSlide eyebrow="Slide 3" title="Processos" subtitle="Status, valores e distribuição da base acompanhada.">
        <div className="presentation-kpis">
          <KpiCard label="Total" value={summary.totalProcessos} tone="orange" />
          <KpiCard label="Ativos" value={summary.processosAtivos} tone="success" />
          <KpiCard label="Encerrados" value={summary.processosEncerrados} />
          <KpiCard label="Valor de causa" value={formatCurrency(summary.valorTotalCausa)} tone="warning" />
        </div>
        <div className="presentation-chart-grid">
          <BarChartCard title="Processos por status" data={data.processos.byStatus} />
          <BarChartCard title="Valor de causa por assunto" data={data.processos.valorPorAssunto} dataKey="value" valueKind="currency" />
        </div>
      </PresentationSlide>

      <PresentationSlide eyebrow="Slide 4" title="CGI" subtitle="Demandas, SLA e eficiência de resposta.">
        <div className="presentation-kpis">
          <KpiCard label="Demandas" value={data.cgi.total} tone="orange" />
          <KpiCard label="Tempo médio" value={formatDays(data.cgi.tempoMedioResposta)} tone="success" />
          <KpiCard label="Dentro do SLA" value={formatPercent(data.cgi.percentualDentroSla)} tone="success" />
          <KpiCard label="LTV médio" value={formatPercent((data.cgi.ltvMedio ?? 0) * 100)} />
        </div>
        <div className="presentation-chart-grid">
          <BarChartCard title="Demandas por cliente" data={data.cgi.porCliente} />
          <PieChartCard title="Dentro/Fora do SLA" data={data.cgi.slaStatus} />
        </div>
      </PresentationSlide>

      <PresentationSlide eyebrow="Slide 5" title="Sydle" subtitle="Indicadores operacionais e cumprimento de SLA.">
        <div className="presentation-kpis">
          <KpiCard label="Demandas" value={data.sydle.total} tone="orange" />
          <KpiCard label="Tempo médio" value={formatDays(data.sydle.tempoMedioResposta)} tone="success" />
          <KpiCard label="SLA médio" value={formatDays(data.sydle.slaMedio)} />
          <KpiCard label="Dentro do SLA" value={formatPercent(data.sydle.percentualDentroSla)} tone="success" />
        </div>
        <div className="presentation-chart-grid">
          <BarChartCard title="Demandas por cliente" data={data.sydle.porCliente} />
          <PieChartCard title="Dentro/Fora do SLA" data={data.sydle.slaStatus} />
        </div>
      </PresentationSlide>

      <PresentationSlide eyebrow="Slide 6" title="Casos Relevantes" subtitle="Top 5 processos para acompanhamento executivo.">
        <div className="presentation-case-grid">
          {data.processos.casosRelevantes.length ? (
            data.processos.casosRelevantes.slice(0, 5).map((item) => <CaseCard key={item.id} item={item} compact />)
          ) : (
            <div className="empty-panel">Sem casos relevantes para exibir.</div>
          )}
        </div>
      </PresentationSlide>

      <PresentationSlide eyebrow="Slide 7" title="Próximos passos" subtitle="Ações registradas na base, quando houver.">
        {data.nextSteps.length ? (
          <ul className="next-step-list">
            {data.nextSteps.map((step) => (
              <li key={`${step.id}-${step.proximo_passo}`}>
                <strong>{step.id}</strong>
                <span>{step.proximo_passo}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-panel">Sem próximos passos registrados nas colunas atuais.</div>
        )}
      </PresentationSlide>
    </main>
  );
}
