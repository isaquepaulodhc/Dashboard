import fs from "node:fs";
import path from "node:path";
import {
  getGoogleDriveFolderId,
  getGoogleDriveSourceLabel,
  hasGoogleDriveConfig,
  isGoogleDriveDataSource
} from "@/services/googleDriveService";

const DEFAULT_SPREADSHEETS_PATH = path.join("data", "spreadsheets");
const GOOGLE_DRIVE_CACHE_PATH = path.join("data", "cache", "google-drive");

export interface SpreadsheetsBasePathInfo {
  dataSource: string;
  configuredPath: string | null;
  defaultPath: string;
  path: string;
  exists: boolean;
  usingDefaultPath: boolean;
  googleDriveFolderUrl: string | null;
}

export interface SpreadsheetFileMetadata {
  found: boolean;
  path: string | null;
  name: string | null;
  lastModified: string | null;
  size: number | null;
  error: string | null;
}

export function getSpreadsheetsBasePath(): SpreadsheetsBasePathInfo {
  const dataSource = process.env.DATA_SOURCE?.trim() || "local";
  const googleDriveFolderUrl = normalizeEnvPath(process.env.GOOGLE_DRIVE_FOLDER_URL ?? process.env.GOOGLE_DRIVE_FOLDER_ID);
  const configuredPath = normalizeEnvPath(process.env.LOCAL_SPREADSHEETS_PATH);
  const usesGoogleDrivePublic = normalizeDataSource(dataSource) === "googledrivepublic";
  const usingDefaultPath = !configuredPath && !usesGoogleDrivePublic;
  const resolvedPath = usesGoogleDrivePublic
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), GOOGLE_DRIVE_CACHE_PATH)
    : configuredPath
      ? resolveLocalPath(configuredPath)
      : path.resolve(/* turbopackIgnore: true */ process.cwd(), DEFAULT_SPREADSHEETS_PATH);

  return {
    dataSource,
    configuredPath,
    defaultPath: path.resolve(/* turbopackIgnore: true */ process.cwd(), DEFAULT_SPREADSHEETS_PATH),
    path: resolvedPath,
    exists: directoryExists(resolvedPath),
    usingDefaultPath,
    googleDriveFolderUrl
  };
}

export function expandSpreadsheetCandidates(candidateNames: string[]) {
  const expanded = new Set<string>();

  for (const name of candidateNames) {
    expanded.add(name);
    const extension = path.extname(name).toLowerCase();
    const baseName = name.slice(0, name.length - extension.length);

    if (extension && extension !== ".csv") {
      expanded.add(`${baseName}.csv`);
    }
  }

  return Array.from(expanded);
}

export function findFirstSpreadsheetFile(candidateNames: string[], basePathInfo = getSpreadsheetsBasePath()): SpreadsheetFileMetadata {
  const candidates = expandSpreadsheetCandidates(candidateNames);

  if (!basePathInfo.exists) {
    return {
      found: false,
      path: null,
      name: null,
      lastModified: null,
      size: null,
      error: `Pasta de planilhas não encontrada: ${basePathInfo.path}`
    };
  }

  for (const name of candidates) {
    const filePath = path.join(basePathInfo.path, name);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const stats = fs.statSync(filePath);

      if (!stats.isFile()) {
        continue;
      }

      return {
        found: true,
        path: filePath,
        name,
        lastModified: stats.mtime.toISOString(),
        size: stats.size,
        error: null
      };
    } catch (error) {
      return {
        found: true,
        path: filePath,
        name,
        lastModified: null,
        size: null,
        error: error instanceof Error ? error.message : "Erro ao acessar metadados do arquivo."
      };
    }
  }

  return {
    found: false,
    path: null,
    name: null,
    lastModified: null,
    size: null,
    error: `Nenhum arquivo encontrado em ${basePathInfo.path}. Procurado por: ${candidates.join(", ")}`
  };
}

function normalizeEnvPath(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^["']|["']$/g, "");
}

function resolveLocalPath(value: string) {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(/* turbopackIgnore: true */ process.cwd(), value);
}

function directoryExists(value: string) {
  try {
    return fs.existsSync(value) && fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function normalizeDataSource(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
