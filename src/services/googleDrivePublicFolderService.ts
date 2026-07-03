import fs from "node:fs";
import path from "node:path";
import { expandSpreadsheetCandidates, type SpreadsheetFileMetadata } from "@/services/spreadsheetsPathService";

const DRIVE_CACHE_DIR = path.join(process.cwd(), "data", "cache", "google-drive");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

interface DriveFileCandidate {
  id: string;
  name: string;
  kind: "binary" | "spreadsheet";
}

export interface GoogleDriveSyncResult {
  folderId: string | null;
  cachePath: string;
  cachePathExists: boolean;
  files: DriveFileCandidate[];
  error: string | null;
}

export function getGoogleDriveFolderId(value: string | undefined) {
  const text = value?.trim().replace(/^["']|["']$/g, "");

  if (!text) {
    return null;
  }

  const folderMatch = text.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch?.[1]) {
    return folderMatch[1];
  }

  const idParamMatch = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch?.[1]) {
    return idParamMatch[1];
  }

  return /^[a-zA-Z0-9_-]{15,}$/.test(text) ? text : null;
}

export async function syncGoogleDrivePublicFolder(folderUrlOrId: string | undefined): Promise<GoogleDriveSyncResult> {
  const folderId = getGoogleDriveFolderId(folderUrlOrId);
  ensureDirectory(DRIVE_CACHE_DIR);

  if (!folderId) {
    return {
      folderId,
      cachePath: DRIVE_CACHE_DIR,
      cachePathExists: true,
      files: [],
      error: "GOOGLE_DRIVE_FOLDER_URL não foi configurado com um link ou ID de pasta válido."
    };
  }

  try {
    const files = await listPublicFolderFiles(folderId);
    const spreadsheetFiles = files.filter((file) => isSupportedSpreadsheetName(file.name));

    if (!spreadsheetFiles.length) {
      return {
        folderId,
        cachePath: DRIVE_CACHE_DIR,
        cachePathExists: true,
        files,
        error:
          "A pasta do Google Drive foi acessada, mas nenhuma planilha com nome esperado foi encontrada. Verifique se há processos.xlsx, cgi.xlsx ou sydle.xlsx e se a pasta está compartilhada."
      };
    }

    await Promise.all(spreadsheetFiles.map((file) => downloadDriveFile(file, DRIVE_CACHE_DIR)));

    return {
      folderId,
      cachePath: DRIVE_CACHE_DIR,
      cachePathExists: true,
      files: spreadsheetFiles,
      error: null
    };
  } catch (error) {
    return {
      folderId,
      cachePath: DRIVE_CACHE_DIR,
      cachePathExists: true,
      files: [],
      error: error instanceof Error ? error.message : "Erro desconhecido ao acessar pasta pública do Google Drive."
    };
  }
}

export function findCachedDriveSpreadsheet(candidateNames: string[]): SpreadsheetFileMetadata {
  const candidates = expandSpreadsheetCandidates(candidateNames);

  for (const name of candidates) {
    const filePath = path.join(DRIVE_CACHE_DIR, name);

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
        error: error instanceof Error ? error.message : "Erro ao acessar cache do Google Drive."
      };
    }
  }

  return {
    found: false,
    path: null,
    name: null,
    lastModified: null,
    size: null,
    error: `Nenhum arquivo encontrado no cache do Google Drive. Procurado por: ${candidates.join(", ")}`
  };
}

export function getGoogleDriveCachePath() {
  return DRIVE_CACHE_DIR;
}

export function clearGoogleDriveCache() {
  ensureDirectory(DRIVE_CACHE_DIR);

  for (const entry of fs.readdirSync(DRIVE_CACHE_DIR)) {
    const filePath = path.join(DRIVE_CACHE_DIR, entry);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      fs.unlinkSync(filePath);
    }
  }
}

async function listPublicFolderFiles(folderId: string): Promise<DriveFileCandidate[]> {
  const urls = [
    `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`,
    `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}?usp=drive_link`
  ];
  let lastStatus = "";
  let html = "";

  for (const url of urls) {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT
      }
    });

    if (!response.ok) {
      lastStatus = `HTTP ${response.status}`;
      continue;
    }

    html = await response.text();
    break;
  }

  if (!html) {
    throw new Error(`Não foi possível acessar a pasta pública do Google Drive. ${lastStatus || "Sem resposta."}`);
  }

  if (html.toLowerCase().includes("accounts.google.com") || html.toLowerCase().includes("request access")) {
    throw new Error("A pasta do Google Drive não parece pública. Compartilhe a pasta como 'qualquer pessoa com o link pode ver'.");
  }

  const files = parseDriveFolderHtml(html);

  if (!files.length) {
    throw new Error("Não foi possível listar arquivos da pasta do Google Drive. Verifique se o link é público e contém arquivos visíveis.");
  }

  return files;
}

function parseDriveFolderHtml(html: string): DriveFileCandidate[] {
  const files = new Map<string, DriveFileCandidate>();
  const linkRegex =
    /href="https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|spreadsheets\/d\/)([a-zA-Z0-9_-]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html))) {
    const id = match[1];
    const rawName = stripHtml(match[2]);
    const name = normalizeDriveFileName(rawName);

    if (!name) {
      continue;
    }

    files.set(id, {
      id,
      name,
      kind: match[0].includes("/spreadsheets/d/") ? "spreadsheet" : "binary"
    });
  }

  if (files.size === 0) {
    parseIdsFromJsonLikeHtml(html).forEach((file) => files.set(file.id, file));
  }

  return Array.from(files.values());
}

function parseIdsFromJsonLikeHtml(html: string): DriveFileCandidate[] {
  const results: DriveFileCandidate[] = [];
  const idRegex = /"(?:https:\\\/\\\/drive\.google\.com\\\/file\\\/d\\\/|https:\\\/\\\/docs\.google\.com\\\/spreadsheets\\\/d\\\/)?([a-zA-Z0-9_-]{20,})"/g;
  let match: RegExpExecArray | null;

  while ((match = idRegex.exec(html))) {
    const id = match[1];
    const windowStart = Math.max(0, match.index - 600);
    const windowEnd = Math.min(html.length, match.index + 600);
    const surrounding = html.slice(windowStart, windowEnd);
    const name = extractLikelyName(surrounding);

    if (!name || !isSupportedSpreadsheetName(name)) {
      continue;
    }

    results.push({
      id,
      name,
      kind: surrounding.includes("spreadsheets") ? "spreadsheet" : "binary"
    });
  }

  return dedupeById(results);
}

function extractLikelyName(value: string) {
  const decoded = value.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").replace(/\\"/g, '"');
  const nameMatch = decoded.match(/"([^"]+\.(?:xlsx|csv))"/i);
  return nameMatch?.[1] ? normalizeDriveFileName(nameMatch[1]) : null;
}

async function downloadDriveFile(file: DriveFileCandidate, cacheDir: string) {
  const url =
    file.kind === "spreadsheet" && !/\.(xlsx|csv)$/i.test(file.name)
      ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(file.id)}/export?format=xlsx`
      : `https://drive.google.com/uc?export=download&id=${encodeURIComponent(file.id)}`;
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`Não foi possível baixar ${file.name} do Google Drive. HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("text/html")) {
    const html = await response.text();
    throw new Error(
      html.toLowerCase().includes("accounts.google.com")
        ? `Arquivo ${file.name} exige login. Compartilhe como público para leitura.`
        : `Arquivo ${file.name} não foi baixado como planilha. Verifique se é .xlsx/.csv e se está público.`
    );
  }

  const extension = path.extname(file.name) || ".xlsx";
  const fileName = path.extname(file.name) ? file.name : `${file.name}${extension}`;
  const destination = path.join(cacheDir, fileName);
  const bytes = Buffer.from(await response.arrayBuffer());

  fs.writeFileSync(destination, bytes);
}

function isSupportedSpreadsheetName(name: string) {
  return expandSpreadsheetCandidates([
    "processos.xlsx",
    "Dados_teste.xlsx",
    "Dados_teste(1).xlsx",
    "cgi.xlsx",
    "CGI teste.xlsx",
    "sydle.xlsx",
    "Sydle Teste.xlsx"
  ]).some((candidate) => candidate.toLowerCase() === name.toLowerCase());
}

function normalizeDriveFileName(value: string) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function dedupeById(files: DriveFileCandidate[]) {
  return Array.from(new Map(files.map((file) => [file.id, file])).values());
}

function ensureDirectory(value: string) {
  fs.mkdirSync(value, {
    recursive: true
  });
}
