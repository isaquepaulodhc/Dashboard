import type { ReactNode } from "react";

interface PresentationSlideProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: boolean;
}

export function PresentationSlide({ eyebrow, title, subtitle, children, accent = false }: PresentationSlideProps) {
  return (
    <section className={`presentation-slide ${accent ? "presentation-slide--accent" : ""}`}>
      <header>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

