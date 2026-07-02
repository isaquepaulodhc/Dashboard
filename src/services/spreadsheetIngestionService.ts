import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import iconv from "iconv-lite";
import Papa from "papaparse";
import type { FileSourceStatus } from "@/types/dashboard";
import {
  expandSpreadsheetCandidates,
  findFirstSpreadsheetFile,
  getSpreadsheetsBasePath
} from "@/services/spreadsheetsPathService";

export type NormalizedRow = Record<string, unknown>;

export interface IngestionResult {
  status: FileSourceStatus;
  rows: NormalizedRow[];
}

export function normalizeColumnName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeTextForCompare(value: unknown) {
  return normalizeColumnName(value).replace(/_/g, " ");
}

export function isMissingValue(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "number") {
    return value === -1 || Number.isNaN(value);
  }

  const text = normalizeTextForCompare(value);
  return ["", "null", "undefined", "nao informado", "na", "n a", "-", "-1"].includes(text);
}

export function textValue(value: unknown): string | null {
  if (isMissingValue(value)) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
}

export function parseBrazilianNumber(value: unknown): number | null {
  if (isMissingValue(value)) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".");
  }

  normalized = normalized.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed === -1) {
    return null;
  }

  return parsed;
}

export function parseExcelOrBrazilianDate(value: unknown): string | null {
  if (isMissingValue(value)) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value);
  }

  if (typeof value === "number" && value > 0) {
    return excelSerialDateToIso(value);
  }

  const text = String(value).trim();
  const serialDate = Number.parseFloat(text);
  if (/^\d+(\.\d+)?$/.test(text) && serialDate > 1000) {
    return parseExcelOrBrazilianDate(serialDate);
  }

  const brDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (brDate) {
    const day = Number(brDate[1]);
    const month = Number(brDate[2]);
    const year = Number(brDate[3].length === 2 ? `20${brDate[3]}` : brDate[3]);
    return toIsoDate(new Date(Date.UTC(year, month - 1, day)));
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDate(parsed);
  }

  return null;
}

export function daysBetween(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) {
    return null;
  }

  const start = new Date(`${startIso}T00:00:00Z`).getTime();
  const end = new Date(`${endIso}T00:00:00Z`).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }

  return Math.round((end - start) / 86_400_000);
}

export function pickValue(row: NormalizedRow, keys: string[]) {
  for (const key of keys) {
    const normalizedKey = normalizeColumnName(key);
    const value = row[normalizedKey];

    if (!isMissingValue(value)) {
      return value;
    }
  }

  return null;
}

export async function readFirstAvailableSpreadsheet(candidateNames: string[]): Promise<IngestionResult> {
  const candidates = expandSpreadsheetCandidates(candidateNames);
  const basePathInfo = getSpreadsheetsBasePath();
  const fileMetadata = findFirstSpreadsheetFile(candidateNames, basePathInfo);

  if (!fileMetadata.found || !fileMetadata.path) {
    return {
      status: {
        found: false,
        path: null,
        name: fileMetadata.name,
        lastModified: fileMetadata.lastModified,
        size: fileMetadata.size,
        rows: 0,
        error: fileMetadata.error ?? `Nenhum arquivo encontrado. Procurado por: ${candidates.join(", ")}`
      },
      rows: []
    };
  }

  try {
    const rows = normalizeRows(await readSpreadsheetRows(fileMetadata.path));

    return {
      status: {
        found: true,
        path: fileMetadata.path,
        name: fileMetadata.name,
        lastModified: fileMetadata.lastModified,
        size: fileMetadata.size,
        rows: rows.length,
        error: null
      },
      rows
    };
  } catch (error) {
    return {
      status: {
        found: true,
        path: fileMetadata.path,
        name: fileMetadata.name,
        lastModified: fileMetadata.lastModified,
        size: fileMetadata.size,
        rows: 0,
        error: error instanceof Error ? error.message : "Erro desconhecido ao ler planilha."
      },
      rows: []
    };
  }
}

async function readSpreadsheetRows(filePath: string): Promise<Record<string, unknown>[]> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".csv") {
    return readCsvRows(filePath);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
    const header = getCellValue(headerRow.getCell(columnIndex).value);
    headers[columnIndex] = String(header ?? "");
  }

  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const record: Record<string, unknown> = {};

    for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
      const header = headers[columnIndex];

      if (!header) {
        continue;
      }

      record[header] = getCellValue(row.getCell(columnIndex).value);
    }

    rows.push(record);
  });

  return rows;
}

function readCsvRows(filePath: string): Record<string, unknown>[] {
  const buffer = fs.readFileSync(filePath);
  const text = decodeCsv(buffer);
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy"
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(`Erro no CSV: ${firstError.message}`);
  }

  return parsed.data;
}

function decodeCsv(buffer: Buffer) {
  const encodings = ["utf8", "win1252", "latin1"];

  for (const encoding of encodings) {
    const decoded = iconv.decode(buffer, encoding).replace(/^\uFEFF/, "");

    if (encoding === "utf8" && decoded.includes("\uFFFD")) {
      continue;
    }

    return decoded;
  }

  return iconv.decode(buffer, "utf8").replace(/^\uFEFF/, "");
}

function normalizeRows(rows: Record<string, unknown>[]): NormalizedRow[] {
  return rows
    .map((row) => {
      const normalized: NormalizedRow = {};

      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeColumnName(key);

        if (!normalizedKey) {
          continue;
        }

        const normalizedValue = normalizeCellValue(value);

        if (normalized[normalizedKey] === undefined || isMissingValue(normalized[normalizedKey])) {
          normalized[normalizedKey] = normalizedValue;
        }
      }

      return normalized;
    })
    .filter((row) => Object.values(row).some((value) => !isMissingValue(value)));
}

function normalizeCellValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  return value;
}

function getCellValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  const cellObject = value as Record<string, unknown>;

  if ("result" in cellObject) {
    return getCellValue(cellObject.result);
  }

  if ("text" in cellObject) {
    return cellObject.text;
  }

  if (Array.isArray(cellObject.richText)) {
    return cellObject.richText
      .map((part) => {
        const richPart = part as Record<string, unknown>;
        return String(richPart.text ?? "");
      })
      .join("");
  }

  return String(value);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function excelSerialDateToIso(serial: number) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  return toIsoDate(new Date(excelEpoch + serial * 86_400_000));
}
