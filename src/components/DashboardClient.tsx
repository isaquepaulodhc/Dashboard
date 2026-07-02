"use client";

import { AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { DataSourceCard } from "@/components/layout/DataSourceCard";
import { NavigationAnchors } from "@/components/layout/NavigationAnchors";
import { CgiSection } from "@/components/sections/CgiSection";
import { ExecutiveOverviewSection } from "@/components/sections/ExecutiveOverviewSection";
import { ProcessesSection } from "@/components/sections/ProcessesSection";
import { RelevantCasesSection } from "@/components/sections/RelevantCasesSection";
import { SydleSection } from "@/components/sections/SydleSection";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { DashboardData, FileSourceStatus } from "@/types/dashboard";

export function DashboardClient() {
  const { data, loading, refreshing, error, refresh } = useDashboardData();

  if (loading && !data) {
    return <LoadingState />;
  }

  if (!data) {
    return (
      <main className="app-shell">
        <div className="error-panel">{error ?? "Não foi possível carregar o dashboard."}</div>
      </main>
    );
  }

  const files = Object.entries(data.files) as Array<[keyof DashboardData["files"], FileSourceStatus]>;
  const hasFileWarnings = files.some(([, file]) => !file.found || file.error);

  return (
    <main className="app-shell">
      <DashboardHeader data={data} files={files} hasFileWarnings={hasFileWarnings} refreshing={refreshing} onRefresh={() => void refresh()} />
      <NavigationAnchors />

      {error ? <AlertCard title="Erro ao carregar dados" message={error} tone="danger" /> : null}

      {hasFileWarnings ? (
        <section className="file-warning-panel">
          <div>
            <AlertTriangle size={20} />
            <h2>Atenção nos arquivos de origem</h2>
          </div>
          <div className="file-warning-grid">
            {files
              .filter(([, file]) => !file.found || file.error)
              .map(([name, file]) => (
                <article key={name}>
                  <strong>{name}</strong>
                  <p>{file.error ?? "Arquivo não encontrado."}</p>
                </article>
              ))}
          </div>
        </section>
      ) : null}

      <DataSourceCard data={data} files={files} />

      <ExecutiveOverviewSection data={data} />
      <ProcessesSection data={data} />
      <CgiSection data={data} />
      <SydleSection data={data} />
      <RelevantCasesSection data={data} />
    </main>
  );
}

function AlertCard({ title, message, tone = "warning" }: { title: string; message: string; tone?: "warning" | "danger" }) {
  return (
    <section className={`alert-card alert-card--${tone}`}>
      <AlertTriangle size={20} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <main className="app-shell">
      <div className="loading-panel">Carregando dashboard...</div>
    </main>
  );
}
