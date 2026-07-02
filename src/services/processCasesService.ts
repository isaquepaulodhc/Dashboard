import type { FileSourceStatus, ProcessCase, ProcessMetrics } from "@/types/dashboard";
import { limitPoints, sortByTotalDesc, sum } from "@/services/metricsHelpers";
import {
  normalizeTextForCompare,
  parseBrazilianNumber,
  parseExcelOrBrazilianDate,
  pickValue,
  readFirstAvailableSpreadsheet,
  textValue,
  type NormalizedRow
} from "@/services/spreadsheetIngestionService";

const PROCESS_CANDIDATES = ["processos.xlsx", "Dados_teste.xlsx", "Dados_teste(1).xlsx"];

export interface ProcessServiceResult {
  status: FileSourceStatus;
  metrics: ProcessMetrics;
}

export async function loadProcessMetrics(): Promise<ProcessServiceResult> {
  const { status, rows } = await readFirstAvailableSpreadsheet(PROCESS_CANDIDATES);
  const cases = rows.map(mapProcessCase).filter((item) => hasProcessData(item));

  const metrics: ProcessMetrics = {
    total: cases.length,
    ativos: cases.filter((item) => item.ativo).length,
    encerrados: cases.filter((item) => item.encerrado).length,
    valorTotalCausa: sum(cases.map((item) => item.valor_causa)),
    valorTotalAluguel: sum(cases.map((item) => item.valor_aluguel_depois)),
    byStatus: groupByCount(cases, "status"),
    byAssunto: groupByCount(cases, "assunto"),
    byComarca: groupByCount(cases, "comarca"),
    bySentenca: groupByCount(cases, "sentenca"),
    valorPorAssunto: groupByValue(cases, "assunto", "valor_causa"),
    valorPorComarca: groupByValue(cases, "comarca", "valor_causa"),
    casosRelevantes: selectRelevantCases(cases)
  };

  return { status: { ...status, rows: cases.length }, metrics };
}

function mapProcessCase(row: NormalizedRow, index: number): ProcessCase {
  const status = textValue(pickValue(row, ["status", "situacao", "situação"]));
  const normalizedStatus = normalizeTextForCompare(status);
  const encerrado = normalizedStatus.includes("extinto") || normalizedStatus.includes("arquivado");

  const ultimaAtualizacaoRaw = pickValue(row, ["ultima_atualizacao", "última atualização", "data_ultima_atualizacao"]);

  return {
    id: textValue(pickValue(row, ["id", "ID", "codigo", "processo"])) ?? `Linha ${index + 2}`,
    assunto: textValue(pickValue(row, ["assunto", "tema"])),
    comarca: textValue(pickValue(row, ["comarca"])),
    vara: textValue(pickValue(row, ["vara"])),
    status,
    polo_ativo: textValue(pickValue(row, ["polo_ativo", "polo ativo", "autor"])),
    polo_passivo: textValue(pickValue(row, ["polo_passivo", "polo passivo", "reu", "réu"])),
    valor_causa: parseBrazilianNumber(pickValue(row, ["valor_causa", "valor da causa"])),
    valor_aluguel_depois: parseBrazilianNumber(pickValue(row, ["valor_aluguel_depois", "valor aluguel depois"])),
    sentenca: textValue(pickValue(row, ["sentenca", "sentença", "resultado_sentenca"])),
    resumo_caso: textValue(pickValue(row, ["resumo_caso", "Resumo do Caso", "resumo_do_caso", "resumo"])),
    ultima_atualizacao: parseExcelOrBrazilianDate(ultimaAtualizacaoRaw) ?? textValue(ultimaAtualizacaoRaw),
    data_sentenca: parseExcelOrBrazilianDate(pickValue(row, ["data_sentenca", "data sentença"])),
    data_distribuicao: parseExcelOrBrazilianDate(pickValue(row, ["data_distribuicao", "data distribuição"])),
    data_transito: parseExcelOrBrazilianDate(pickValue(row, ["data_transito", "data trânsito", "data transito"])),
    classe: textValue(pickValue(row, ["classe"])),
    responsavel: textValue(pickValue(row, ["responsavel", "responsável"])),
    prioridade: textValue(pickValue(row, ["prioridade"])),
    risco: textValue(pickValue(row, ["risco"])),
    proximo_passo: textValue(pickValue(row, ["proximo_passo", "próximo passo", "proximo passo"])),
    data_ultima_atualizacao: parseExcelOrBrazilianDate(pickValue(row, ["data_ultima_atualizacao", "data última atualização"])),
    ativo: !encerrado,
    encerrado
  };
}

function hasProcessData(item: ProcessCase) {
  return Boolean(
    item.id ||
      item.assunto ||
      item.comarca ||
      item.status ||
      item.valor_causa ||
      item.resumo_caso ||
      item.ultima_atualizacao
  );
}

function groupByCount(cases: ProcessCase[], key: keyof ProcessCase) {
  const map = new Map<string, number>();

  for (const item of cases) {
    const label = String(item[key] ?? "Não informado");
    map.set(label, (map.get(label) ?? 0) + 1);
  }

  return limitPoints(sortByTotalDesc(Array.from(map, ([name, total]) => ({ name, total }))));
}

function groupByValue(cases: ProcessCase[], labelKey: keyof ProcessCase, valueKey: keyof ProcessCase) {
  const map = new Map<string, number>();

  for (const item of cases) {
    const label = String(item[labelKey] ?? "Não informado");
    const value = Number(item[valueKey] ?? 0);
    map.set(label, (map.get(label) ?? 0) + (Number.isFinite(value) ? value : 0));
  }

  return limitPoints(sortByTotalDesc(Array.from(map, ([name, value]) => ({ name, value }))));
}

function selectRelevantCases(cases: ProcessCase[]) {
  return [...cases]
    .sort((a, b) => {
      return (
        Number(b.ativo || isSuspended(b.status)) - Number(a.ativo || isSuspended(a.status)) ||
        (b.valor_causa ?? 0) - (a.valor_causa ?? 0) ||
        Number(Boolean(b.ultima_atualizacao)) - Number(Boolean(a.ultima_atualizacao)) ||
        relevanceFlag(b) - relevanceFlag(a) ||
        dateScore(b.ultima_atualizacao) - dateScore(a.ultima_atualizacao)
      );
    })
    .slice(0, 10);
}

function isSuspended(status: string | null) {
  return normalizeTextForCompare(status).includes("suspenso");
}

function relevanceFlag(item: ProcessCase) {
  const priority = normalizeTextForCompare(item.prioridade);
  const risk = normalizeTextForCompare(item.risco);
  return Number(priority.includes("alta") || risk.includes("alto"));
}

function dateScore(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 1;
}

