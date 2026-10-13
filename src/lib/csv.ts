import type { CsvRow } from "./aggregate";

function escapeCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows: CsvRow[]): string {
  const header = "metric,label,count,share";
  const lines = rows.map((row) =>
    [row.metric, row.label, row.count, row.share].map(escapeCell).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}
