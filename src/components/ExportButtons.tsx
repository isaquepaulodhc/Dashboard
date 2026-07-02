"use client";

import { Download, FileText } from "lucide-react";
import type { DashboardData } from "@/types/dashboard";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface ExportButtonsProps {
  data: DashboardData;
}

export function ExportButtons({ data }: ExportButtonsProps) {
  return (
    <div className="action-row">
      <button type="button" className="secondary-button" onClick={() => exportJson(data)}>
        <Download size={16} />
        Exportar JSON
      </button>
      <button type="button" className="secondary-button" onClick={() => exportMarkdown(data)}>
        <FileText size={16} />
        Exportar Markdown
      </button>
    </div>
  );
}

function exportJson(data: DashboardData) {
  downloadBlob(JSON.stringify(data, null, 2), `dashboard-executivo-${dateStamp()}.json`, "application/json;charset=utf-8");
}

function exportMarkdown(data: DashboardData) {
  // TODO: adicionar exportacao PDF e PowerPoint apos aprovacao do modelo de apresentacao.
  const summary = data.executiveSummary;
  const cases = data.processos.casosRelevantes
    .slice(0, 10)
    .map((item, index) => `${index + 1}. ${item.id} - ${item.assunto ?? "Sem assunto"} - ${item.status ?? "Sem status"}`)
    .join("\n");

  const markdown = `# Resumo mensal - Diretoria Dashboard

Referencia: ${data.referenceMonth}
Atualizado em: ${new Date(data.lastUpdated).toLocaleString("pt-BR")}

${data.executiveText}

## Indicadores principais

- Total de processos: ${summary.totalProcessos}
- Processos ativos: ${summary.processosAtivos}
- Processos encerrados: ${summary.processosEncerrados}
- Valor total de causa: ${formatCurrency(summary.valorTotalCausa)}
- Valor total de aluguel: ${formatCurrency(summary.valorTotalAluguel)}
- Demandas CGI: ${summary.demandasCgi}
- Demandas Sydle: ${summary.demandasSydle}
- Dentro do SLA CGI: ${formatPercent(summary.percentualDentroSlaCgi)}
- Dentro do SLA Sydle: ${formatPercent(summary.percentualDentroSlaSydle)}

## Casos relevantes

${cases || "Sem casos relevantes no periodo."}
`;

  downloadBlob(markdown, `resumo-mensal-${dateStamp()}.md`, "text/markdown;charset=utf-8");
}

function downloadBlob(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

