import { useCallback } from "react";
import Papa from "papaparse";

export function useCsvExport() {
    const exportToCsv = useCallback(
        <T extends Record<string, unknown>>(
            data: T[],
            filename: string,
            columns?: { key: string; label: string }[],
        ) => {
            const rows = columns
                ? data.map((row) => {
                      const obj: Record<string, unknown> = {};
                      for (const col of columns) {
                          obj[col.label] = row[col.key];
                      }
                      return obj;
                  })
                : data;

            const csv = Papa.unparse(rows);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${filename}.csv`);
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },
        [],
    );

    return { exportToCsv };
}
