import { useState } from "react";
import { Plus, Trash2, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TableEditor({ data, columns, onDataChange, merges = [], onMergesChange }) {
  const [editCell, setEditCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectMode, setSelectMode] = useState(false);

  const startEdit = (rowIdx, colName) => {
    setEditCell({ rowIdx, colName });
    setEditValue(String(data[rowIdx][colName] ?? ""));
  };

  const saveEdit = () => {
    if (!editCell) return;
    const newData = data.map((row, i) =>
      i === editCell.rowIdx ? { ...row, [editCell.colName]: editValue } : row
    );
    onDataChange(newData);
    setEditCell(null);
  };

  const addRow = () => {
    const newRow = Object.fromEntries(columns.map(c => [c.name, ""]));
    onDataChange([...data, newRow]);
  };

  const addColumn = () => {
    const colName = `Column${columns.length + 1}`;
    const newData = data.map(row => ({ ...row, [colName]: "" }));
    onDataChange(newData);
  };

  const deleteRow = (idx) => {
    onDataChange(data.filter((_, i) => i !== idx));
  };

  const deleteColumn = (colName) => {
    const newData = data.map(row => {
      const { [colName]: _, ...rest } = row;
      return rest;
    });
    onDataChange(newData);
  };

  const toggleCellSelection = (rowIdx, colIdx) => {
    if (!selectMode) return;
    const cellKey = `${rowIdx}-${colIdx}`;
    const newSelected = new Set(selectedCells);
    if (newSelected.has(cellKey)) {
      newSelected.delete(cellKey);
    } else {
      newSelected.add(cellKey);
    }
    setSelectedCells(newSelected);
  };

  const mergeCells = () => {
    if (selectedCells.size < 2) return;
    const cells = Array.from(selectedCells).map(key => {
      const [r, c] = key.split('-').map(Number);
      return [r, c];
    });
    const minRow = Math.min(...cells.map(c => c[0]));
    const maxRow = Math.max(...cells.map(c => c[0]));
    const minCol = Math.min(...cells.map(c => c[1]));
    const maxCol = Math.max(...cells.map(c => c[1]));
    const mergeKey = `${minRow}-${minCol}-${maxRow}-${maxCol}`;
    if (!merges.some(m => m === mergeKey)) {
      onMergesChange([...merges, mergeKey]);
    }
    setSelectedCells(new Set());
  };

  const unmergeCells = (mergeKey) => {
    onMergesChange(merges.filter(m => m !== mergeKey));
  };

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
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant={selectMode ? "default" : "outline"} 
          onClick={() => { setSelectMode(!selectMode); setSelectedCells(new Set()); }}
          className="gap-1.5 text-xs h-8"
        >
          {selectMode ? "✓ Velgmodus aktiv" : "Velg celler"}
        </Button>
        <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5 text-xs h-8">
          <Plus className="w-3.5 h-3.5" />Legg til rad
        </Button>
        <Button size="sm" variant="outline" onClick={addColumn} className="gap-1.5 text-xs h-8">
          <Plus className="w-3.5 h-3.5" />Legg til kolonne
        </Button>
        {selectMode && selectedCells.size > 1 && (
          <Button size="sm" onClick={mergeCells} className="gap-1.5 text-xs h-8 bg-primary">
            <Copy className="w-3.5 h-3.5" />Slå sammen {selectedCells.size} celler
          </Button>
        )}
      </div>

      {selectMode && selectedCells.size > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedCells.size} celle(r) valgt • Klikk på celler for å velge/velge bort
        </p>
      )}

      {merges.length > 0 && (
        <div className="text-xs space-y-1 p-2 rounded-lg bg-muted/30">
          <p className="font-medium text-muted-foreground">Sammensatte celler:</p>
          {merges.map((merge, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-muted/50 hover:bg-muted/70">
              <span className="text-muted-foreground">{merge}</span>
              <button
                onClick={() => unmergeCells(merge)}
                className="text-xs text-destructive hover:bg-destructive/20 px-2 py-0.5 rounded transition-colors"
              >
                Avslå
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
              {columns.map(col => (
                <th key={col.name} className="px-2 py-1.5 text-left font-medium text-muted-foreground relative group">
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.name}</span>
                    <button
                      onClick={() => deleteColumn(col.name)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded transition-all text-destructive"
                      title="Slett kolonne"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-2 py-1 text-muted-foreground font-mono">
                  <div className="flex items-center justify-between gap-1">
                    <span>{rowIdx + 1}</span>
                    <button
                      onClick={() => deleteRow(rowIdx)}
                      className="opacity-0 hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded transition-all text-destructive"
                      title="Slett rad"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                {columns.map((col, colIdx) => {
                  if (isCellMerged(rowIdx, colIdx)) return null;
                  
                  const mergeSpan = getCellMergeSpan(rowIdx, colIdx);
                  const isEditing = editCell?.rowIdx === rowIdx && editCell?.colName === col.name;
                  const isSelected = selectedCells.has(`${rowIdx}-${colIdx}`);
                  
                  return (
                    <td
                      key={col.name}
                      className={`px-2 py-1 border-l border-border/30 ${selectMode ? 'cursor-pointer' : 'cursor-text'} ${isSelected ? 'bg-primary/20' : ''}`}
                      rowSpan={mergeSpan?.rowSpan}
                      colSpan={mergeSpan?.colSpan}
                      onClick={() => toggleCellSelection(rowIdx, colIdx)}
                    >
                      {isEditing ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") setEditCell(null);
                            }}
                            className="flex-1 px-1 py-0.5 text-xs border border-ring rounded bg-background text-foreground outline-none"
                          />
                          <button onClick={saveEdit} className="p-0.5 hover:bg-primary/20 rounded text-primary">
                            <span className="text-xs">✓</span>
                          </button>
                          <button onClick={() => setEditCell(null)} className="p-0.5 hover:bg-destructive/20 rounded text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(rowIdx, col.name);
                          }}
                          className="px-1 py-0.5 rounded cursor-pointer hover:bg-muted/50 transition-colors text-foreground/80 truncate max-w-[150px]"
                          title={String(row[col.name] ?? "")}
                        >
                          {String(row[col.name] ?? "")}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}