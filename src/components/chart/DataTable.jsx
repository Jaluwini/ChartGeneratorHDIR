import { useState } from "react";
import { ChevronDown, ChevronUp, Table2, Maximize2, X } from "lucide-react";

function FullscreenTable({ data, columns, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <span className="font-semibold text-sm text-foreground">
          Datatabell — {data.length} rader × {columns.length} kolonner
        </span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border bg-muted/50">
              {columns.map(col => (
                <th key={col.name} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">
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
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                {columns.map(col => (
                  <td key={col.name} className="px-3 py-2 whitespace-nowrap text-foreground/80">
                    {String(row[col.name] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DataTable({ data, columns }) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  if (!data || data.length === 0) return null;

  const displayRows = expanded ? data : data.slice(0, 5);

  return (
    <div className="space-y-2">
      {fullscreen && (
        <FullscreenTable data={data} columns={columns} onClose={() => setFullscreen(false)} />
      )}

      <div className="flex items-center gap-2 w-full">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex-1"
        >
          <Table2 className="w-3.5 h-3.5" />
          <span>Datatabell — {data.length} rader × {columns.length} kol.</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setFullscreen(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Fullskjerm"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

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
          Viser 5 av {data.length} rader •{" "}
          <button className="text-primary underline underline-offset-2" onClick={() => setExpanded(true)}>
            Vis alle
          </button>
        </p>
      )}
    </div>
  );
}