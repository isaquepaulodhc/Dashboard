import { CaseCard } from "@/components/cards/CaseCard";
import { SectionHeader } from "@/components/layout/SectionHeader";
import type { DashboardData } from "@/types/dashboard";

export function RelevantCasesSection({ data }: { data: DashboardData }) {
  return (
    <section className="dashboard-section dashboard-section--cases" aria-labelledby="casos">
      <SectionHeader
        id="casos"
        title="Casos Relevantes"
        subtitle="Processos que exigem acompanhamento executivo ou possuem maior impacto potencial."
        source="Fonte: processos.xlsx"
      />

      <div className="case-grid-new">
        {data.processos.casosRelevantes.length ? (
          data.processos.casosRelevantes.map((item) => <CaseCard key={item.id} item={item} />)
        ) : (
          <div className="empty-panel">Sem casos relevantes para exibir.</div>
        )}
      </div>
    </section>
  );
}
