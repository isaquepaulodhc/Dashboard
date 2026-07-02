"use client";

import { X } from "lucide-react";
import type { ProcessCase } from "@/types/dashboard";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface CaseDetailsModalProps {
  item: ProcessCase;
  onClose: () => void;
}

export function CaseDetailsModal({ item, onClose }: CaseDetailsModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Detalhes do processo ${item.id}`}>
      <aside className="case-drawer">
        <header className="case-drawer__header">
          <div>
            <span>Processo</span>
            <h2>{item.id}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar detalhes">
            <X size={20} />
          </button>
        </header>

        <DetailSection
          title="Identificação"
          items={[
            ["Assunto", item.assunto],
            ["Comarca", item.comarca],
            ["Vara", item.vara],
            ["Status", item.status],
            ["Sentença", item.sentenca]
          ]}
        />
        <DetailSection
          title="Partes"
          items={[
            ["Polo ativo", item.polo_ativo],
            ["Polo passivo", item.polo_passivo]
          ]}
        />
        <DetailSection
          title="Valores"
          items={[
            ["Valor da causa", item.valor_causa ? formatCurrency(item.valor_causa) : null],
            ["Valor de aluguel", item.valor_aluguel_depois ? formatCurrency(item.valor_aluguel_depois) : null]
          ]}
        />
        <DetailSection
          title="Datas"
          items={[
            ["Distribuição", item.data_distribuicao ? formatDate(item.data_distribuicao) : null],
            ["Sentença", item.data_sentenca ? formatDate(item.data_sentenca) : null],
            ["Trânsito", item.data_transito ? formatDate(item.data_transito) : null]
          ]}
        />
        <TextSection title="Resumo do caso" value={item.resumo_caso} />
        <TextSection title="Última atualização" value={item.ultima_atualizacao} />
      </aside>
    </div>
  );
}

function DetailSection({ title, items }: { title: string; items: Array<[string, string | null | undefined]> }) {
  const visibleItems = items.filter(([, value]) => value);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <section className="case-drawer__section">
      <h3>{title}</h3>
      <dl>
        {visibleItems.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TextSection({ title, value }: { title: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <section className="case-drawer__section case-drawer__text">
      <h3>{title}</h3>
      <p>{value}</p>
    </section>
  );
}
