import { Button } from "@carbon/react";
import { Download } from "@carbon/icons-react";
import { useCsvExport } from "../hooks/useCsvExport";

interface CsvExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  columns?: { key: string; label: string }[];
  label?: string;
}

export function CsvExportButton<T extends Record<string, unknown>>({
  data,
  filename,
  columns,
  label = "Export CSV",
}: CsvExportButtonProps<T>) {
  const { exportToCsv } = useCsvExport();

  return (
    <Button
      kind="ghost"
      size="sm"
      renderIcon={Download}
      onClick={() => exportToCsv(data, filename, columns)}
      aria-label={`Export ${filename} as CSV`}
    >
      {label}
    </Button>
  );
}
