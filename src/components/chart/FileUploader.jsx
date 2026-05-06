import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectColumns } from "@/lib/chartUtils";
import { SAMPLE_DATA, SAMPLE_COLUMNS } from "@/lib/sampleData";
import JsonRGuide from "./JsonRGuide";

export default function FileUploader({ onDataLoaded }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [fileName, setFileName] = useState(null);

  const loadSample = () => {
    setError(null);
    setSheets([]);
    setFileName("sample_data.csv");
    onDataLoaded({ data: SAMPLE_DATA, columns: SAMPLE_COLUMNS, fileName: "sample_data.csv" });
  };

  const processSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (!raw || raw.length === 0) {
      setError("The selected sheet has no data.");
      return;
    }
    const columns = detectColumns(raw);
    onDataLoaded({ data: raw, columns, fileName, sheetName });
    setError(null);
  };

  const handleFile = (file) => {
    setError(null);
    setSheets([]);
    setWorkbook(null);
    setSelectedSheet(null);
    setFileName(file.name);

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (result) => {
          if (!result.data || result.data.length === 0) {
            setError("CSV file is empty or could not be parsed.");
            return;
          }
          const columns = detectColumns(result.data);
          onDataLoaded({ data: result.data, columns, fileName: file.name });
        },
        error: () => setError("Failed to parse CSV file."),
      });
    } else if (["xlsx", "xls"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: "array" });
        setWorkbook(wb);
        const sheetNames = wb.SheetNames;
        if (sheetNames.length === 1) {
          setSheets([]);
          processSheet(wb, sheetNames[0]);
        } else {
          setSheets(sheetNames);
          setSelectedSheet(sheetNames[0]);
          processSheet(wb, sheetNames[0]);
        }
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsArrayBuffer(file);
    } else if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        let parsed;
        try {
          parsed = JSON.parse(e.target.result);
        } catch {
          setError("Failed to parse JSON file. Make sure it is valid JSON.");
          return;
        }
        // Support multiple JSON structures: array, { data: [...] }, { rows: [...] }, or Highcharts config
        let rows = null;
        let chartConfig = null;
        
        if (Array.isArray(parsed)) {
          rows = parsed;
        } else if (parsed && typeof parsed === 'object') {
          // Try direct data/rows first
          rows = Array.isArray(parsed.data) ? parsed.data : Array.isArray(parsed.rows) ? parsed.rows : null;
          chartConfig = parsed.config;
          
          // If no rows found, try to extract from Highcharts series format
          if (!rows && parsed.series && Array.isArray(parsed.series) && parsed.series.length > 0) {
            const firstSeries = parsed.series[0];
            if (Array.isArray(firstSeries.data) && firstSeries.data.length > 0) {
              rows = firstSeries.data;
              // Detect xAxis from categories or first object key, yAxes from series names
              const xAxisField = parsed.xAxis?.title?.text || Object.keys(rows[0])?.[0] || "x";
              const yAxesFields = parsed.series.map(s => s.name || "y");
              
              const titleText = parsed.title?.text;
              const subtitleText = parsed.subtitle?.text;
              chartConfig = {
                xAxis: xAxisField,
                yAxes: yAxesFields,
                title: typeof titleText === "string" ? titleText : "",
                subtitle: typeof subtitleText === "string" ? subtitleText : "",
                xAxisTitle: parsed.xAxis?.title?.text || "",
                yAxisTitle: parsed.yAxis?.title?.text || "",
                chartType: parsed.chart?.type || "line",
              };
            }
          }
        }
        
        if (!rows || rows.length === 0) {
          setError("JSON file must be an array of objects, have 'data'/'rows' field, or be a Highcharts config with series data.");
          return;
        }
        const columns = detectColumns(rows);
        onDataLoaded({ data: rows, columns, fileName: file.name, ...(chartConfig && { chartConfig }) });
      };
      reader.onerror = () => setError("Failed to read file.");
      reader.readAsText(file);
    } else {
      setError("Unsupported file type. Please upload .csv, .xls, .xlsx, or .json.");
    }
  };

  const onFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    setError(null);
    setFileName("pasted_data");
    try {
      const lines = text.trim().split("\n");
      if (lines.length === 0) {
        setError("No data in clipboard.");
        return;
      }
      const headers = lines[0].split("\t");
      const data = lines.slice(1).map(line => {
        const values = line.split("\t");
        return Object.fromEntries(headers.map((h, i) => [h, values[i] || ""]));
      });
      if (data.length === 0) {
        setError("Clipboard data has no rows.");
        return;
      }
      const columns = detectColumns(data);
      onDataLoaded({ data, columns, fileName: "pasted_data" });
    } catch (err) {
      setError("Failed to parse clipboard data. Make sure it's tab-separated.");
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onPaste={handlePaste}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all p-5
          ${dragging
            ? "border-primary bg-accent/50 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-accent/30 bg-muted/30"
          }`}
        tabIndex={0}
      >
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Drop file, paste data, or click to upload</p>
          <p className="text-xs text-muted-foreground mt-0.5">CSV, XLS, XLSX, JSON, or tab-separated from Excel/Word</p>
        </div>
        <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx,.json" className="hidden" onChange={onFileInput} />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 text-xs"
        onClick={loadSample}
      >
        <Database className="w-3.5 h-3.5" />
        Load sample data
      </Button>

      {fileName && !error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 text-xs text-accent-foreground">
          <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate font-medium">{fileName}</span>
        </div>
      )}

      {sheets.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select sheet</p>
          <div className="flex flex-wrap gap-1.5">
            {sheets.map(s => (
              <button
                key={s}
                onClick={() => { setSelectedSheet(s); processSheet(workbook, s); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all
                  ${selectedSheet === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <JsonRGuide />
    </div>
  );
}