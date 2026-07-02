const anchors = [
  { href: "#visao-executiva", label: "Visão Executiva" },
  { href: "#processos", label: "Processos" },
  { href: "#cgi", label: "CGI" },
  { href: "#sydle", label: "Sydle" },
  { href: "#casos", label: "Casos" }
];

export function NavigationAnchors() {
  return (
    <nav className="anchor-nav" aria-label="Navegação do dashboard">
      {anchors.map((anchor) => (
        <a key={anchor.href} href={anchor.href}>
          {anchor.label}
        </a>
      ))}
    </nav>
  );
}
