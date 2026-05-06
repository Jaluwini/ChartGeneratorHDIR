import { useRef, useState } from "react";
import { Upload, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { detectColumns } from "@/lib/chartUtils";

export default function BarometerUploader({ onDataLoaded }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  const processFile = (file) => {
    setError(null);
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let parsed = JSON.parse(e.target.result);
          if (!Array.isArray(parsed)) parsed = [parsed];
          const columns = detectColumns(parsed);
          setFileName(file.name);
          onDataLoaded({ data: parsed, columns });
        } catch {
          setError("Ugyldig JSON-fil.");
        }
      };
      reader.readAsText(file);
    } else if (ext === "csv" || ext === "txt") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (result) => {
          if (!result.data || result.data.length === 0) { setError("Filen er tom."); return; }
          const columns = detectColumns(result.data);
          setFileName(file.name);
          onDataLoaded({ data: result.data, columns });
        },
        error: (err) => setError(err.message),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          const columns = detectColumns(rows);
          setFileName(file.name);
          onDataLoaded({ data: rows, columns });
        } catch {
          setError("Kunne ikke lese Excel-fil.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError("Støttede formater: CSV, JSON, XLSX");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all px-4 py-6 text-center
          ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
      >
        <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs font-medium text-foreground">
          {fileName ? `✓ ${fileName}` : "Slipp fil her eller klikk for å velge"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">CSV, JSON, XLSX</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,.xlsx,.xls,.txt"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) processFile(e.target.files[0]); }}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}