import type { DashboardData, ExecutiveSummary, FileSourceStatus, NextStep } from "@/types/dashboard";
import { loadCgiMetrics } from "@/services/cgiMetricsService";
import { loadProcessMetrics } from "@/services/processCasesService";
import { loadSydleMetrics } from "@/services/sydleMetricsService";
import { prisma } from "@/lib/prisma";
import { getSpreadsheetsBasePath } from "@/services/spreadsheetsPathService";

let dashboardCache: {
  data: DashboardData;
  createdAt: number;
} | null = null;

export async function getDashboardData(forceRefresh = false): Promise<DashboardData> {
  const refreshSeconds = getRefreshSeconds();

  if (!forceRefresh && dashboardCache && Date.now() - dashboardCache.createdAt < refreshSeconds * 1000) {
    return dashboardCache.data;
  }

  const data = await buildDashboardData(refreshSeconds);
  dashboardCache = {
    data,
    createdAt: Date.now()
  };

  await persistSnapshot(data, forceRefresh ? "manual-refresh" : "dashboard-read");
  return data;
}

export async function refreshDashboardData() {
  dashboardCache = null;
  return getDashboardData(true);
}

export async function getDashboardHealth() {
  const data = await getDashboardData(false);
  const errors = Object.entries(data.files)
    .filter(([, file]) => file.error)
    .map(([name, file]) => `${name}: ${file.error}`);

  return {
    status: !data.spreadsheetsPathExists ? "error" : errors.length ? "warning" : "ok",
    ok: data.spreadsheetsPathExists && errors.length === 0,
    dataSource: data.dataSource,
    spreadsheetsPath: data.spreadsheetsPath,
    spreadsheetsPathExists: data.spreadsheetsPathExists,
    lastUpdated: data.lastUpdated,
    files: data.files,
    errors,
    message: !data.spreadsheetsPathExists
      ? `Pasta de planilhas não encontrada: ${data.spreadsheetsPath}`
      : errors.length
        ? "Alguns arquivos não foram encontrados ou apresentaram erro de leitura."
        : "Fonte de dados local acessível."
  };
}

async function buildDashboardData(refreshSeconds: number): Promise<DashboardData> {
  const [processos, cgi, sydle] = await Promise.all([loadProcessMetrics(), loadCgiMetrics(), loadSydleMetrics()]);
  const spreadsheetsPath = getSpreadsheetsBasePath();
  const now = new Date();
  const executiveSummary: ExecutiveSummary = {
    totalProcessos: processos.metrics.total,
    processosAtivos: processos.metrics.ativos,
    processosEncerrados: processos.metrics.encerrados,
    valorTotalCausa: processos.metrics.valorTotalCausa,
    valorTotalAluguel: processos.metrics.valorTotalAluguel,
    demandasCgi: cgi.metrics.total,
    demandasSydle: sydle.metrics.total,
    slaMedioCgi: cgi.metrics.slaMedio,
    slaMedioSydle: sydle.metrics.slaMedio,
    percentualDentroSlaCgi: cgi.metrics.percentualDentroSla,
    percentualDentroSlaSydle: sydle.metrics.percentualDentroSla
  };

  const files: Record<"processos" | "cgi" | "sydle", FileSourceStatus> = {
    processos: processos.status,
    cgi: cgi.status,
    sydle: sydle.status
  };

  const nextSteps = buildNextSteps(processos.metrics.casosRelevantes);

  return {
    lastUpdated: now.toISOString(),
    referenceMonth: formatReferenceMonth(now),
    refreshSeconds,
    dataSource: spreadsheetsPath.dataSource,
    spreadsheetsPath: spreadsheetsPath.path,
    spreadsheetsPathExists: spreadsheetsPath.exists,
    usingDefaultSpreadsheetsPath: spreadsheetsPath.usingDefaultPath,
    files,
    executiveSummary,
    processos: {
      byStatus: processos.metrics.byStatus,
      byAssunto: processos.metrics.byAssunto,
      byComarca: processos.metrics.byComarca,
      bySentenca: processos.metrics.bySentenca,
      valorPorAssunto: processos.metrics.valorPorAssunto,
      valorPorComarca: processos.metrics.valorPorComarca,
      casosRelevantes: processos.metrics.casosRelevantes
    },
    cgi: cgi.metrics,
    sydle: sydle.metrics,
    nextSteps,
    executiveText: buildExecutiveText(executiveSummary)
  };
}

function buildExecutiveText(summary: ExecutiveSummary) {
  return `No mês de referência, foram acompanhados ${summary.totalProcessos} processos, dos quais ${summary.processosAtivos} permanecem ativos e ${summary.processosEncerrados} foram encerrados. O valor total de causa monitorado é de ${formatCurrency(summary.valorTotalCausa)}. A frente CGI registrou ${summary.demandasCgi} demandas, com ${summary.percentualDentroSlaCgi}% dentro do SLA. A frente Sydle registrou ${summary.demandasSydle} demandas, com ${summary.percentualDentroSlaSydle}% dentro do SLA. Os principais casos relevantes estão listados abaixo.`;
}

function buildNextSteps(cases: DashboardData["processos"]["casosRelevantes"]): NextStep[] {
  return cases
    .filter((item) => item.proximo_passo)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      assunto: item.assunto,
      responsavel: item.responsavel,
      proximo_passo: item.proximo_passo ?? ""
    }));
}

function getRefreshSeconds() {
  const parsed = Number.parseInt(process.env.DASHBOARD_REFRESH_SECONDS ?? "60", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

function formatReferenceMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

async function persistSnapshot(data: DashboardData, source: string) {
  try {
    await prisma.dashboardSnapshot.create({
      data: {
        lastUpdated: new Date(data.lastUpdated),
        payload: JSON.stringify(data),
        summary: JSON.stringify(data.executiveSummary)
      }
    });

    await prisma.refreshLog.create({
      data: {
        source,
        success: true,
        message: "Dashboard consolidado com sucesso."
      }
    });
  } catch (error) {
    console.warn("Nao foi possivel gravar snapshot/log no SQLite.", error);
  }
}
