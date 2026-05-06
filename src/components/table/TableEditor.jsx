import { useState } from "react";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TableEditor({ data, columns, onDataChange }) {
  const [editCell, setEditCell] = useState(null);
  const [editValue, setEditValue] = useState("");

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

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5 text-xs h-8">
          <Plus className="w-3.5 h-3.5" />Legg til rad
        </Button>
        <Button size="sm" variant="outline" onClick={addColumn} className="gap-1.5 text-xs h-8">
          <Plus className="w-3.5 h-3.5" />Legg til kolonne
        </Button>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-xs">
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
                {columns.map(col => {
                  const isEditing = editCell?.rowIdx === rowIdx && editCell?.colName === col.name;
                  return (
                    <td key={col.name} className="px-2 py-1 border-l border-border/30">
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
                          onClick={() => startEdit(rowIdx, col.name)}
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