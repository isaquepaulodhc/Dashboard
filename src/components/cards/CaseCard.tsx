"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CaseDetailsModal } from "@/components/cards/CaseDetailsModal";
import type { ProcessCase } from "@/types/dashboard";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface CaseCardProps {
  item: ProcessCase;
  compact?: boolean;
}

export function CaseCard({ item, compact = false }: CaseCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article className={`case-card-new ${compact ? "case-card-new--compact" : ""}`}>
        <header className="case-card-new__header">
          <div>
            <span>Processo</span>
            <strong>{item.id}</strong>
          </div>
          <div className="case-card-new__badges">
            <mark className={item.ativo ? "case-badge case-badge--active" : "case-badge"}>{item.ativo ? "Ativo" : "Encerrado"}</mark>
            {item.sentenca ? <mark className="case-badge case-badge--sentence">{item.sentenca}</mark> : null}
          </div>
        </header>

        <div className="case-card-new__value">
          <span>Valor da causa</span>
          <strong>{item.valor_causa ? formatCurrency(item.valor_causa) : "Não informado"}</strong>
        </div>

        <div className="case-card-new__meta">
          <Info label="Assunto" value={item.assunto} />
          <Info label="Comarca" value={item.comarca} />
          <Info label="Vara" value={item.vara} />
        </div>

        <div className="case-card-new__parties">
          <Info label="Polo ativo" value={item.polo_ativo} clamp="clamp-2" />
          <Info label="Polo passivo" value={item.polo_passivo} clamp="clamp-2" />
        </div>

        {item.resumo_caso ? (
          <section className="case-card-new__text">
            <span>Resumo do caso</span>
            <p className="clamp-4">{item.resumo_caso}</p>
          </section>
        ) : null}

        {item.ultima_atualizacao ? (
          <section className="case-card-new__text">
            <span>Última atualização</span>
            <p className="clamp-4">{item.ultima_atualizacao}</p>
          </section>
        ) : null}

        <footer className="case-card-new__footer">
          <div>
            <small>Distribuição</small>
            <strong>{item.data_distribuicao ? formatDate(item.data_distribuicao) : "N/I"}</strong>
          </div>
          <div>
            <small>Sentença</small>
            <strong>{item.data_sentenca ? formatDate(item.data_sentenca) : "N/I"}</strong>
          </div>
          {item.data_transito ? (
            <div>
              <small>Trânsito</small>
              <strong>{formatDate(item.data_transito)}</strong>
            </div>
          ) : null}
          <button type="button" className="case-details-button" onClick={() => setOpen(true)}>
            Ver detalhes
            <ArrowRight size={15} />
          </button>
        </footer>
      </article>

      {open ? <CaseDetailsModal item={item} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Info({ label, value, clamp }: { label: string; value: string | null | undefined; clamp?: string }) {
  return (
    <div>
      <span>{label}</span>
      <p className={clamp}>{value ?? "Não informado"}</p>
    </div>
  );
}
