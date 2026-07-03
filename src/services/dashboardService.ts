import type { DashboardData, ExecutiveSummary, FileSourceStatus, NextStep } from "@/types/dashboard";
import { clearGoogleDriveCache, syncGoogleDrivePublicFolder } from "@/services/googleDrivePublicFolderService";
import { loadCgiMetrics } from "@/services/cgiMetricsService";
import { loadProcessMetrics } from "@/services/processCasesService";
import { loadSydleMetrics } from "@/services/sydleMetricsService";
import { getSpreadsheetsBasePath } from "@/services/spreadsheetsPathService";
import { prisma } from "@/lib/prisma";

let dashboardCache: {
  data: DashboardData;
  createdAt: number;
} | null = null;

export async function getDashboardData(forceRefresh = false): Promise<DashboardData> {
  const refreshSeconds = getRefreshSeconds();

  if (!forceRefresh && dashboardCache && Date.now() - dashboardCache.createdAt < refreshSeconds * 1000) {
    return dashboardCache.data;
  }

  const data = await buildDashboardData(refreshSeconds, forceRefresh);
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
  const fileErrors = Object.entries(data.files)
    .filter(([, file]) => file.error)
    .map(([name, file]) => `${name}: ${file.error}`);
  const errors = data.dataSourceError ? [data.dataSourceError, ...fileErrors] : fileErrors;

  return {
    status: data.dataSourceError || !data.spreadsheetsPathExists ? "error" : fileErrors.length ? "warning" : "ok",
    ok: !data.dataSourceError && data.spreadsheetsPathExists && fileErrors.length === 0,
    dataSource: data.dataSource,
    googleDriveFolderId: data.googleDriveFolderId,
    spreadsheetsPath: data.spreadsheetsPath,
    spreadsheetsPathExists: data.spreadsheetsPathExists,
    lastUpdated: data.lastUpdated,
    files: data.files,
    errors,
    message: data.dataSourceError
      ? data.dataSourceError
      : !data.spreadsheetsPathExists
        ? `Pasta de planilhas nao encontrada: ${data.spreadsheetsPath}`
        : fileErrors.length
          ? "Alguns arquivos nao foram encontrados ou apresentaram erro de leitura."
          : "Fonte de dados acessivel."
  };
}

async function buildDashboardData(refreshSeconds: number, forceRefresh: boolean): Promise<DashboardData> {
  const dataSourceState = await prepareDataSource(forceRefresh);
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
    googleDriveFolderId: dataSourceState.googleDriveFolderId,
    dataSourceError: dataSourceState.error,
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

async function prepareDataSource(forceRefresh: boolean) {
  const pathInfo = getSpreadsheetsBasePath();
  const normalizedDataSource = pathInfo.dataSource.replace(/[^a-z0-9]/gi, "").toLowerCase();

  if (normalizedDataSource !== "googledrivepublic") {
    return {
      googleDriveFolderId: null,
      error: null
    };
  }

  if (forceRefresh) {
    clearGoogleDriveCache();
  }

  const syncResult = await syncGoogleDrivePublicFolder(pathInfo.googleDriveFolderUrl ?? undefined);

  return {
    googleDriveFolderId: syncResult.folderId,
    error: syncResult.error
  };
}

function buildExecutiveText(summary: ExecutiveSummary) {
  return `No mes de referencia, foram acompanhados ${summary.totalProcessos} processos, dos quais ${summary.processosAtivos} permanecem ativos e ${summary.processosEncerrados} foram encerrados. O valor total de causa monitorado e de ${formatCurrency(summary.valorTotalCausa)}. A frente CGI registrou ${summary.demandasCgi} demandas, com ${summary.percentualDentroSlaCgi}% dentro do SLA. A frente Sydle registrou ${summary.demandasSydle} demandas, com ${summary.percentualDentroSlaSydle}% dentro do SLA. Os principais casos relevantes estao listados abaixo.`;
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
        success: !data.dataSourceError,
        message: data.dataSourceError ?? "Dashboard consolidado com sucesso."
      }
    });
  } catch (error) {
    console.warn("Nao foi possivel gravar snapshot/log no SQLite.", error);
  }
}
