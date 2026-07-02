import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diretoria Dashboard",
  description: "Dashboard Executivo Jurídico para apresentações mensais à diretoria."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

