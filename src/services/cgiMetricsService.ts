import type { FileSourceStatus, ServiceMetrics } from "@/types/dashboard";
import { average, percentage, round, sortByTotalDesc, sum } from "@/services/metricsHelpers";
import {
  daysBetween,
  parseBrazilianNumber,
  parseExcelOrBrazilianDate,
  pickValue,
  readFirstAvailableSpreadsheet,
  textValue,
  type NormalizedRow
} from "@/services/spreadsheetIngestionService";

const CGI_CANDIDATES = ["cgi.xlsx", "CGI teste.xlsx"];

interface CgiRecord {
  cliente: string;
  sla: number | null;
  tempoRespostaDias: number | null;
  dentroSla: boolean;
  valorImovel: number | null;
  valorOperacao: number | null;
  ltv: number | null;
}

export interface CgiServiceResult {
  status: FileSourceStatus;
  metrics: ServiceMetrics;
}

export async function loadCgiMetrics(): Promise<CgiServiceResult> {
  const { status, rows } = await readFirstAvailableSpreadsheet(CGI_CANDIDATES);
  const records = rows.map(mapCgiRecord);

  return {
    status: { ...status, rows: records.length },
    metrics: buildCgiMetrics(records)
  };
}

function mapCgiRecord(row: NormalizedRow): CgiRecord {
  const dataAbertura = parseExcelOrBrazilianDate(pickValue(row, ["data_de_abertura", "data abertura", "data_abertura"]));
  const dataResposta = parseExcelOrBrazilianDate(pickValue(row, ["data_de_resposta", "data resposta", "data_resposta"]));
  const sla = parseBrazilianNumber(pickValue(row, ["sla"]));
  const tempoRespostaDias = daysBetween(dataAbertura, dataResposta);
  const valorImovel = parseBrazilianNumber(pickValue(row, ["valor_do_imovel", "valor do imóvel", "valor_imovel"]));
  const valorOperacao = parseBrazilianNumber(pickValue(row, ["valor_da_operacao", "valor da operação", "valor_operacao"]));
  const ltv = valorImovel && valorOperacao ? round(valorOperacao / valorImovel, 4) : null;

  return {
    cliente: textValue(pickValue(row, ["cliente"])) ?? "Não informado",
    sla,
    tempoRespostaDias,
    dentroSla: tempoRespostaDias !== null && sla !== null && tempoRespostaDias <= sla,
    valorImovel,
    valorOperacao,
    ltv
  };
}

function buildCgiMetrics(records: CgiRecord[]): ServiceMetrics {
  const dentroSla = records.filter((item) => item.dentroSla).length;
  const foraSla = records.length - dentroSla;

  return {
    total: records.length,
    slaMedio: average(records.map((item) => item.sla)),
    tempoMedioResposta: average(records.map((item) => item.tempoRespostaDias)),
    percentualDentroSla: percentage(dentroSla, records.length),
    dentroSla,
    foraSla,
    valorTotalImoveis: sum(records.map((item) => item.valorImovel)),
    valorTotalOperacoes: sum(records.map((item) => item.valorOperacao)),
    ltvMedio: average(records.map((item) => item.ltv)),
    porCliente: groupCgiByClient(records),
    slaStatus: [
      { name: "Dentro do SLA", total: dentroSla },
      { name: "Fora do SLA", total: foraSla }
    ]
  };
}

function groupCgiByClient(records: CgiRecord[]) {
  const groups = new Map<string, CgiRecord[]>();

  for (const record of records) {
    groups.set(record.cliente, [...(groups.get(record.cliente) ?? []), record]);
  }

  return sortByTotalDesc(
    Array.from(groups, ([name, items]) => {
      const inside = items.filter((item) => item.dentroSla).length;

      return {
        name,
        total: items.length,
        slaMedio: average(items.map((item) => item.sla)),
        tempoMedioResposta: average(items.map((item) => item.tempoRespostaDias)),
        percentualDentroSla: percentage(inside, items.length),
        valorTotalImoveis: sum(items.map((item) => item.valorImovel)),
        valorTotalOperacoes: sum(items.map((item) => item.valorOperacao)),
        ltvMedio: average(items.map((item) => item.ltv))
      };
    })
  );
}

