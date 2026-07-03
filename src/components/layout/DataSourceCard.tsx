import { ExternalLink, FolderOpen } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import type { DashboardData, FileSourceStatus } from "@/types/dashboard";

interface DataSourceCardProps {
  data: DashboardData;
  files: Array<[keyof DashboardData["files"], FileSourceStatus]>;
}

export function DataSourceCard({ data, files }: DataSourceCardProps) {
  return (
    <section className="data-source-card" aria-label="Fonte dos dados">
      <header>
        <div>
          <span>Fonte dos dado</span>
          <strong>{data.spreadsheetsPath}</strong>
          <small>{data.spreadsheetsPathExists ? "Pasta encontrada" : "Pasta não encontrada"}</small>
        </div>
        <a href="/api/health" target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          Abrir health
        </a>
      </header>

      <div className="data-source-files">
        {files.map(([key, file]) => (
          <article key={key} className={file.found && !file.error ? "data-source-file data-source-file--ok" : "data-source-file"}>
            <FolderOpen size={16} />
            <div>
              <strong>{file.name ?? key}</strong>
              <span>
                {file.found ? "Encontrado" : "Não encontrado"}
                {file.lastModified ? ` — atualizado em ${formatDateTime(file.lastModified)}` : ""}
                {file.size ? ` — ${formatBytes(file.size)}` : ""}
              </span>
              {file.error ? <small>{file.error}</small> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
