interface SectionHeaderProps {
  id: string;
  title: string;
  subtitle: string;
  source: string;
}

export function SectionHeader({ id, title, subtitle, source }: SectionHeaderProps) {
  return (
    <header className="section-title" id={id}>
      <div>
        <span className="section-kicker">{source}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
