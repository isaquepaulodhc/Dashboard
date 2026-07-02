import type { FileSourceStatus, ServiceMetrics } from "@/types/dashboard";
import { average, percentage, sortByTotalDesc } from "@/services/metricsHelpers";
import {
  daysBetween,
  parseBrazilianNumber,
  parseExcelOrBrazilianDate,
  pickValue,
  readFirstAvailableSpreadsheet,
  textValue,
  type NormalizedRow
} from "@/services/spreadsheetIngestionService";

const SYDLE_CANDIDATES = ["sydle.xlsx", "Sydle Teste.xlsx"];

interface SydleRecord {
  cliente: string;
  sla: number | null;
  tempoRespostaDias: number | null;
  dentroSla: boolean;
}

export interface SydleServiceResult {
  status: FileSourceStatus;
  metrics: ServiceMetrics;
}

export async function loadSydleMetrics(): Promise<SydleServiceResult> {
  const { status, rows } = await readFirstAvailableSpreadsheet(SYDLE_CANDIDATES);
  const records = rows.map(mapSydleRecord);

  return {
    status: { ...status, rows: records.length },
    metrics: buildSydleMetrics(records)
  };
}

function mapSydleRecord(row: NormalizedRow): SydleRecord {
  const dataAbertura = parseExcelOrBrazilianDate(pickValue(row, ["data_de_abertura", "data abertura", "data_abertura"]));
  const dataResposta = parseExcelOrBrazilianDate(pickValue(row, ["data_de_resposta", "data resposta", "data_resposta"]));
  const sla = parseBrazilianNumber(pickValue(row, ["sla"]));
  const tempoRespostaDias = daysBetween(dataAbertura, dataResposta);

  return {
    cliente: textValue(pickValue(row, ["cliente"])) ?? "Não informado",
    sla,
    tempoRespostaDias,
    dentroSla: tempoRespostaDias !== null && sla !== null && tempoRespostaDias <= sla
  };
}

function buildSydleMetrics(records: SydleRecord[]): ServiceMetrics {
  const dentroSla = records.filter((item) => item.dentroSla).length;
  const foraSla = records.length - dentroSla;

  return {
    total: records.length,
    slaMedio: average(records.map((item) => item.sla)),
    tempoMedioResposta: average(records.map((item) => item.tempoRespostaDias)),
    percentualDentroSla: percentage(dentroSla, records.length),
    dentroSla,
    foraSla,
    porCliente: groupSydleByClient(records),
    slaStatus: [
      { name: "Dentro do SLA", total: dentroSla },
      { name: "Fora do SLA", total: foraSla }
    ]
  };
}

function groupSydleByClient(records: SydleRecord[]) {
  const groups = new Map<string, SydleRecord[]>();

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
        percentualDentroSla: percentage(inside, items.length)
      };
    })
  );
}

