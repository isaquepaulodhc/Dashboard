export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value ?? 0);
}

export function formatPercent(value: number | null | undefined) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1
  }).format(value ?? 0)}%`;
}

export function formatDays(value: number | null | undefined) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1
  }).format(value ?? 0)} dias`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Não informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Não informado";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short"
  }).format(date);
}

