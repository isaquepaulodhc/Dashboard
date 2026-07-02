"use client";

import Link from "next/link";
import { FileJson, Presentation, RefreshCw } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";
import { formatDateTime } from "@/lib/formatters";
import type { DashboardData, FileSourceStatus } from "@/types/dashboard";

interface DashboardHeaderProps {
  data: DashboardData;
  files: Array<[keyof DashboardData["files"], FileSourceStatus]>;
  hasFileWarnings: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ data, files, hasFileWarnings, refreshing, onRefresh }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header__bar">
        <div className="brand-block">
          <span className="brand-mark">DD</span>
          <div>
            <p className="eyebrow">Diretoria Dashboard</p>
            <h1>Dashboard Executivo Jurídico</h1>
            <p>Apresentação mensal à diretoria</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="reference-box">
            <span>Mês de referência</span>
            <strong>{data.referenceMonth}</strong>
            <small>{formatDateTime(data.lastUpdated)}</small>
          </div>
          <button type="button" className="primary-button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            {refreshing ? "Atualizando dados..." : "Atualizar agora"}
          </button>
          <Link className="secondary-button" href="/presentation">
            <Presentation size={17} />
            Modo apresentação
          </Link>
        </div>
      </div>

      <div className="dashboard-hero">
        <div>
          <span className="hero-badge">Resumo executivo do mês</span>
          <p>{data.executiveText}</p>
        </div>
        <div className="hero-actions">
          <StatusIndicator files={files} hasFileWarnings={hasFileWarnings} />
          <ExportButtons data={data} />
        </div>
      </div>
    </header>
  );
}

function StatusIndicator({
  files,
  hasFileWarnings
}: {
  files: Array<[keyof DashboardData["files"], FileSourceStatus]>;
  hasFileWarnings: boolean;
}) {
  return (
    <div className="header-file-status">
      <span className={`status-dot ${hasFileWarnings ? "status-dot--warning" : "status-dot--ok"}`} />
      <strong>{hasFileWarnings ? "Atenção nos arquivos" : "Arquivos lidos"}</strong>
      <div>
        {files.map(([name, file]) => (
          <span key={name} className={file.found && !file.error ? "file-pill file-pill--ok" : "file-pill file-pill--warning"}>
            <FileJson size={13} />
            {name}: {file.found ? `${file.rows} linhas` : "não encontrado"}
          </span>
        ))}
      </div>
    </div>
  );
}
