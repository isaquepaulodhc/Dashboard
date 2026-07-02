import type { ChartPoint } from "@/types/dashboard";

export function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function sum(values: Array<number | null | undefined>): number {
  let total = 0;

  for (const value of values) {
    if (Number.isFinite(value ?? NaN)) {
      total += Number(value);
    }
  }

  return total;
}

export function average(values: Array<number | null | undefined>) {
  const validValues = values.filter((value): value is number => Number.isFinite(value ?? NaN));
  if (validValues.length === 0) {
    return 0;
  }

  return round(sum(validValues) / validValues.length);
}

export function percentage(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return round((part / total) * 100);
}

export function sortByTotalDesc(points: ChartPoint[]): ChartPoint[] {
  return [...points].sort((a, b) => (b.total ?? b.value ?? 0) - (a.total ?? a.value ?? 0));
}

export function limitPoints(points: ChartPoint[], limit = 8): ChartPoint[] {
  if (points.length <= limit) {
    return points;
  }

  const main = points.slice(0, limit - 1);
  const rest = points.slice(limit - 1);
  const totalRest = sum(rest.map((point) => point.total ?? point.value ?? 0));

  return [...main, { name: "Outros", total: totalRest, value: totalRest }];
}
