import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

function getCfColor(value, config) {
  if (!config.conditionalFormat || !config.cfColumn) return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  if (config.cfHigh !== undefined && config.cfHigh !== "" && n >= config.cfHigh) return config.cfHighColor || "#dcfce7";
  if (config.cfLow !== undefined && config.cfLow !== "" && n <= config.cfLow) return config.cfLowColor || "#fee2e2";
  return config.cfMidColor || "#fef9c3";
}

export default function TablePreview({ data, columns, config = {} }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const visibleCols = useMemo(() => {
    const orderedNames = config.visibleColumns ?? columns.map(c => c.name);
    return orderedNames.map(name => columns.find(c => c.name === name)).filter(Boolean);
  }, [config.visibleColumns, columns]);

  const aliases = config.columnAliases || {};
  const fontSize = config.fontSize || "sm";
  const textAlign = config.textAlign || "left";
  const pageSize = config.pageSize || 0;

  const filtered = useMemo(() => {
    let rows = [...(data || [])];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(row =>
        visibleCols.some(col => String(row[col.name] ?? "").toLowerCase().includes(q))
      );
    }
    if (sortCol) {
      rows.sort((a, b) => {
        const va = a[sortCol]; const vb = b[sortCol];
        const na = parseFloat(va); const nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortDir === "asc" ? na - nb : nb - na;
        return sortDir === "asc"
          ? String(va ?? "").localeCompare(String(vb ?? ""))
          : String(vb ?? "").localeCompare(String(va ?? ""));
      });
    }
    return rows;
  }, [data, search, sortCol, sortDir, visibleCols]);

  if (!data || data.length === 0) return null;

  const handleSort = (col) => {
    if (!config.sortable) return;
    if (sortCol === col.name) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col.name);
      setSortDir("asc");
    }
    setPage(0);
  };



  const totalPages = pageSize > 0 ? Math.ceil(filtered.length / pageSize) : 1;
  const displayRows = pageSize > 0 ? filtered.slice(page * pageSize, (page + 1) * pageSize) : filtered;

  const headerBg = config.headerBg || "#f4f4f5";
  const headerText = config.headerText || "#111827";
  const stripedColor = config.stripedColor || "#f9fafb";
  const hoverColor = config.hoverColor || "#f3f4f6";
  const borderColor = config.borderColor || "#e5e7eb";
  const tableBg = config.tableBg || "#ffffff";
  const numberColor = config.numberColor || "#2563eb";

  const cellPadding = config.compact ? "px-3 py-1.5" : "px-4 py-2.5";
  const fontSizeClass = `text-${fontSize}`;
  const merges = config.merges || [];

  const isCellMerged = (rowIdx, colIdx) => {
    return merges.some(merge => {
      const [mr1, mc1, mr2, mc2] = merge.split('-').map(Number);
      return rowIdx >= mr1 && rowIdx <= mr2 && colIdx >= mc1 && colIdx <= mc2 && !(rowIdx === mr1 && colIdx === mc1);
    });
  };

  const getCellMergeSpan = (rowIdx, colIdx) => {
    for (const merge of merges) {
      const [mr1, mc1, mr2, mc2] = merge.split('-').map(Number);
      if (rowIdx === mr1 && colIdx === mc1) {
        return { rowSpan: mr2 - mr1 + 1, colSpan: mc2 - mc1 + 1 };
      }
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col" style={{ background: tableBg }}>
      {/* Header */}
      {(config.title || config.subtitle) && (
        <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor }}>
          {config.title && <h2 className="text-base font-bold" style={{ color: headerText }}>{config.title}</h2>}
          {config.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>}
        </div>
      )}

      {/* Search */}
      {config.showSearch !== false && (
        <div className="px-4 py-2.5 border-b" style={{ borderColor }}>
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Søk i tabellen…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              style={{ borderColor }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${fontSizeClass}`} style={{ tableLayout: config.nowrap ? "fixed" : "auto" }}>
          <thead style={config.stickyHeader !== false ? { position: "sticky", top: 0, zIndex: 10 } : {}}>
            <tr style={{ background: headerBg }}>
              {config.showRowNumbers && (
                <th className={`${cellPadding} text-left font-semibold ${!config.nowrap ? "whitespace-nowrap" : ""} border-b`}
                  style={{ color: headerText, borderColor }}>#</th>
              )}
              {visibleCols.map(col => (
                <th
                  key={col.name}
                  onClick={() => handleSort(col)}
                  className={`${cellPadding} font-semibold ${!config.nowrap ? "whitespace-nowrap" : ""} border-b select-none ${config.sortable !== false ? "cursor-pointer hover:opacity-80" : ""}`}
                  style={{ color: headerText, borderColor, textAlign }}
                >
                  <span className="inline-flex items-center gap-1">
                    {aliases[col.name] ?? col.name}
                    {config.sortable !== false && (
                      sortCol === col.name
                        ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                        : <ChevronsUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => {
              const globalIdx = pageSize > 0 ? page * pageSize + i : i;
              const isStriped = config.striped !== false && i % 2 === 1;
              return (
                <tr
                  key={i}
                  style={{
                    background: isStriped ? stripedColor : tableBg,
                    borderBottom: `1px solid ${borderColor}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverColor}
                  onMouseLeave={e => e.currentTarget.style.background = isStriped ? stripedColor : tableBg}
                >
                  {config.showRowNumbers && (
                    <td className={`${cellPadding} text-muted-foreground`} style={{ borderColor, textAlign }}>{globalIdx + 1}</td>
                  )}
                  {visibleCols.map((col, colIdx) => {
                    if (isCellMerged(i, colIdx)) return null;
                    
                    const val = row[col.name];
                    const isNum = col.type === "number";
                    const cfColor = config.conditionalFormat && config.cfColumn === col.name
                      ? getCfColor(val, config)
                      : null;
                    const mergeSpan = getCellMergeSpan(i, colIdx);
                    
                    return (
                      <td
                        key={col.name}
                        className={`${cellPadding} ${!config.nowrap ? "whitespace-nowrap" : ""}`}
                        rowSpan={mergeSpan?.rowSpan}
                        colSpan={mergeSpan?.colSpan}
                        style={{
                          textAlign,
                          color: isNum && config.highlightNumbers ? numberColor : undefined,
                          background: cfColor || undefined,
                          fontWeight: isNum && config.highlightNumbers ? 500 : undefined,
                          overflowWrap: config.nowrap ? "break-word" : "normal",
                        }}
                      >
                        {String(val ?? "")}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: pagination + source + count */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t text-xs text-muted-foreground" style={{ borderColor }}>
        <span>{filtered.length} rader{search ? ` (filtrert fra ${data.length})` : ""}</span>
        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>Side {page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {config.sourceText && <span className="text-[10px] italic">Kilde: {config.sourceText}</span>}
      </div>

      {/* Footnotes */}
      {config.footnotes && config.footnotes.length > 0 && (
        <div className="px-4 py-3 border-t space-y-1.5" style={{ borderColor, background: `${tableBg}e8` }}>
          {config.footnotes.map((note, idx) => (
            <div key={idx} className="text-xs text-muted-foreground">
              <span className="font-mono">{idx + 1}.</span> {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}