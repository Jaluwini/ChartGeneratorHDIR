import { useState } from "react";
import { ChevronDown, ChevronUp, Table2 } from "lucide-react";

export default function DataTable({ data, columns }) {
  const [expanded, setExpanded] = useState(false);

  if (!data || data.length === 0) return null;

  const displayRows = expanded ? data : data.slice(0, 5);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Table2 className="w-3.5 h-3.5" />
        <span>Data preview — {data.length} rows × {columns.length} cols</span>
        <span className="ml-auto">{expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
      </button>

      <div className="rounded-lg border border-border overflow-auto max-h-48">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map(col => (
                <th key={col.name} className="px-2.5 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  <span>{col.name}</span>
                  <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${
                    col.type === "number" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                  }`}>
                    {col.type === "number" ? "#" : "T"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                {columns.map(col => (
                  <td key={col.name} className="px-2.5 py-1.5 whitespace-nowrap text-foreground/80">
                    {String(row[col.name] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!expanded && data.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing 5 of {data.length} rows •{" "}
          <button className="text-primary underline underline-offset-2" onClick={() => setExpanded(true)}>
            Show all
          </button>
        </p>
      )}
    </div>
  );
}