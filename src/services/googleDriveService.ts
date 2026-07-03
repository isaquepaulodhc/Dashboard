const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const EXCEL_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const GOOGLE_SHEETS_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  size: number | null;
}

interface GoogleDriveFileListResponse {
  files?: Array<{
    id?: string;
    name?: string;
    mimeType?: string;
    modifiedTime?: string;
    size?: string;
  }>;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export function isGoogleDriveDataSource(value = process.env.DATA_SOURCE) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "google-drive" || normalized === "googledrive" || normalized === "drive";
}

export function getGoogleDriveFolderId() {
  return extractGoogleDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);
}

export function getGoogleDriveSourceLabel() {
  const folderId = getGoogleDriveFolderId();
  return folderId ? `Google Drive folder ${folderId}` : "Google Drive";
}

export function hasGoogleDriveConfig() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_REFRESH_TOKEN?.trim() &&
      getGoogleDriveFolderId()
  );
}

export async function findFirstGoogleDriveSpreadsheetFile(candidateNames: string[]) {
  const files = await listGoogleDriveFiles(candidateNames);
  const filesByName = new Map(files.map((file) => [file.name.toLowerCase(), file]));

  for (const name of candidateNames) {
    const file = filesByName.get(name.toLowerCase());

    if (file) {
      return file;
    }
  }

  return null;
}

export async function downloadGoogleDriveSpreadsheet(file: GoogleDriveFileMetadata): Promise<Buffer<ArrayBuffer>> {
  const accessToken = await getGoogleAccessToken();
  const url =
    file.mimeType === GOOGLE_SHEETS_MIME_TYPE
      ? `${DRIVE_FILES_URL}/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(EXCEL_MIME_TYPE)}`
      : `${DRIVE_FILES_URL}/${encodeURIComponent(file.id)}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Erro ao baixar ${file.name} do Google Drive: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function listGoogleDriveFiles(candidateNames: string[]) {
  const folderId = getGoogleDriveFolderId();

  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID nao foi configurado.");
  }

  const accessToken = await getGoogleAccessToken();
  const query = [
    `'${escapeDriveQueryValue(folderId)}' in parents`,
    "trashed = false",
    `(${candidateNames.map((name) => `name = '${escapeDriveQueryValue(name)}'`).join(" or ")})`
  ].join(" and ");

  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name,mimeType,modifiedTime,size)",
    pageSize: String(Math.max(candidateNames.length, 10)),
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true"
  });

  const response = await fetch(`${DRIVE_FILES_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Erro ao listar arquivos do Google Drive: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as GoogleDriveFileListResponse;

  return (payload.files ?? []).flatMap<GoogleDriveFileMetadata>((file) => {
    if (!file.id || !file.name || !file.mimeType) {
      return [];
    }

    return [
      {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime ?? null,
        size: file.size ? Number.parseInt(file.size, 10) : null
      }
    ];
  });
}

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }),
    cache: "no-store"
  });

  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Erro ao autenticar no Google Drive.");
  }

  return payload.access_token;
}

function extractGoogleDriveFolderId(value: string | undefined) {
  const trimmed = value?.trim().replace(/^["']|["']$/g, "");

  if (!trimmed) {
    return null;
  }

  const folderMatch = trimmed.match(/\/folders\/([^/?#]+)/);

  if (folderMatch?.[1]) {
    return folderMatch[1];
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.searchParams.get("id") ?? trimmed;
  } catch {
    return trimmed;
  }
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
