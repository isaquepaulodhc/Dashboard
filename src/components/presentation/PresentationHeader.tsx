"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface PresentationHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function PresentationHeader({ refreshing, onRefresh }: PresentationHeaderProps) {
  return (
    <header className="presentation-toolbar">
      <strong>Diretoria Dashboard</strong>
      <div>
        <button type="button" className="primary-button" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={17} className={refreshing ? "spin" : ""} />
          {refreshing ? "Atualizando..." : "Atualizar"}
        </button>
        <Link href="/" className="secondary-button">
          <ArrowLeft size={17} />
          Dashboard
        </Link>
      </div>
    </header>
  );
}

