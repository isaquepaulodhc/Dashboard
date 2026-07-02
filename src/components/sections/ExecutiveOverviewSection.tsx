import { BadgeCheck, Banknote, BriefcaseBusiness, Clock, FileStack, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/cards/KpiCard";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { formatCurrency, formatDays, formatPercent } from "@/lib/formatters";
import type { DashboardData } from "@/types/dashboard";

export function ExecutiveOverviewSection({ data }: { data: DashboardData }) {
  const summary = data.executiveSummary;

  return (
    <section className="dashboard-section dashboard-section--executive" aria-labelledby="visao-executiva">
      <SectionHeader
        id="visao-executiva"
        title="Visão Executiva"
        subtitle="Resumo consolidado dos principais indicadores jurídicos do mês."
        source="Fonte: planilhas consolidadas"
      />

      <div className="kpi-grid">
        <KpiCard label="Total de processos" value={summary.totalProcessos} description="Base jurídica acompanhada" icon={<FileStack size={18} />} tone="orange" />
        <KpiCard label="Processos ativos" value={summary.processosAtivos} description="Demandam acompanhamento" icon={<BadgeCheck size={18} />} tone="success" />
        <KpiCard label="Processos encerrados" value={summary.processosEncerrados} description="Extintos ou arquivados" icon={<BriefcaseBusiness size={18} />} />
        <KpiCard label="Valor total de causa" value={formatCurrency(summary.valorTotalCausa)} description="Montante monitorado" icon={<Banknote size={18} />} tone="warning" />
        {summary.valorTotalAluguel > 0 ? (
          <KpiCard label="Valor total de aluguel" value={formatCurrency(summary.valorTotalAluguel)} description="Quando informado na base" icon={<Banknote size={18} />} tone="warning" />
        ) : null}
        <KpiCard label="Demandas CGI" value={summary.demandasCgi} description="Entradas CGI no período" icon={<TrendingUp size={18} />} tone="orange" />
        <KpiCard label="Demandas Sydle" value={summary.demandasSydle} description="Entradas Sydle no período" icon={<TrendingUp size={18} />} tone="orange" />
        <KpiCard label="SLA médio CGI" value={formatDays(summary.slaMedioCgi)} description="Média contratada" icon={<Clock size={18} />} />
        <KpiCard label="SLA médio Sydle" value={formatDays(summary.slaMedioSydle)} description="Média contratada" icon={<Clock size={18} />} />
        <KpiCard label="% dentro do SLA CGI" value={formatPercent(summary.percentualDentroSlaCgi)} description="Demandas atendidas no prazo" icon={<BadgeCheck size={18} />} tone="success" />
        <KpiCard label="% dentro do SLA Sydle" value={formatPercent(summary.percentualDentroSlaSydle)} description="Demandas atendidas no prazo" icon={<BadgeCheck size={18} />} tone="success" />
      </div>

      <article className="executive-summary-card">
        <span>Resumo Executivo do Mês</span>
        <p>{data.executiveText}</p>
        <div className="summary-highlights">
          <strong>{summary.totalProcessos} processos</strong>
          <strong>{formatCurrency(summary.valorTotalCausa)}</strong>
          <strong>{formatPercent(summary.percentualDentroSlaCgi)} CGI no SLA</strong>
          <strong>{formatPercent(summary.percentualDentroSlaSydle)} Sydle no SLA</strong>
        </div>
      </article>
    </section>
  );
}

