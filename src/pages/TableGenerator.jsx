import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table2, BookMarked, RefreshCw, Save, ArrowLeft, Settings2, Eye, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import FileUploader from "@/components/chart/FileUploader";
import ApiDataImporter from "@/components/chart/ApiDataImporter";
import DataTable from "@/components/chart/DataTable";
import { base44 } from "@/api/base44Client";

const DEFAULT_CONFIG = {
  title: "",
  subtitle: "",
  striped: true,
  compact: false,
  showColumnTypes: false,
  visibleColumns: null, // null = all
};

function TablePreview({ data, columns, config }) {
  if (!data || data.length === 0) return null;

  const cols = config.visibleColumns
    ? columns.filter(c => config.visibleColumns.includes(c.name))
    : columns;

  return (
    <div className="w-full overflow-x-auto">
      {config.title && (
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
          {config.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>}
        </div>
      )}
      <table className={`w-full text-sm ${config.compact ? "text-xs" : ""}`}>
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {cols.map(col => (
              <th key={col.name} className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                {col.name}
                {config.showColumnTypes && (
                  <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded font-normal ${
                    col.type === "number" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                  }`}>
                    {col.type === "number" ? "#" : "T"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                config.striped && i % 2 === 1 ? "bg-muted/20" : ""
              }`}
            >
              {cols.map(col => (
                <td key={col.name} className={`px-4 ${config.compact ? "py-1.5" : "py-2.5"} text-foreground/80 whitespace-nowrap`}>
                  {String(row[col.name] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableConfig({ config, onChange, columns }) {
  const set = (k, v) => onChange({ ...config, [k]: v });

  const toggleColumn = (name) => {
    const current = config.visibleColumns ?? columns.map(c => c.name);
    const next = current.includes(name)
      ? current.filter(n => n !== name)
      : [...current, name];
    set("visibleColumns", next.length === columns.length ? null : next);
  };

  const visibleSet = new Set(config.visibleColumns ?? columns.map(c => c.name));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground font-medium">Tittel <span className="text-destructive">*</span></label>
        <input
          value={config.title}
          onChange={e => set("title", e.target.value)}
          placeholder="Tabellens tittel"
          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-ring/50 ${!config.title ? "border-destructive" : "border-input"}`}
        />
        {!config.title && <p className="text-[11px] text-destructive">Tittel er obligatorisk</p>}
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground font-medium">Undertittel</label>
        <input
          value={config.subtitle}
          onChange={e => set("subtitle", e.target.value)}
          placeholder="Valgfri undertittel"
          className="w-full rounded-lg border border-input px-2.5 py-1.5 text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      <div className="space-y-2 pt-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Visning</p>
        {[
          { key: "striped", label: "Stripete rader" },
          { key: "compact", label: "Kompakt visning" },
          { key: "showColumnTypes", label: "Vis kolonnetype-merker" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-foreground">{label}</span>
            <input type="checkbox" checked={!!config[key]} onChange={e => set(key, e.target.checked)} className="accent-primary" />
          </label>
        ))}
      </div>

      {columns.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Synlige kolonner</p>
          <div className="space-y-1">
            {columns.map(col => (
              <label key={col.name} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleSet.has(col.name)}
                  onChange={() => toggleColumn(col.name)}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground truncate">{col.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildTableHtml(data, columns, config) {
  const cols = config.visibleColumns
    ? columns.filter(c => config.visibleColumns.includes(c.name))
    : columns;

  const headerRow = cols.map(c => `<th style="padding:10px 16px;text-align:left;font-weight:600;background:#f4f4f5;border-bottom:2px solid #e4e4e7">${c.name}</th>`).join("");
  const bodyRows = data.map((row, i) => {
    const bg = config.striped && i % 2 === 1 ? 'style="background:#fafafa"' : '';
    const cells = cols.map(c => `<td style="padding:${config.compact ? "6px 16px" : "10px 16px"};border-bottom:1px solid #f0f0f0">${String(row[c.name] ?? "")}</td>`).join("");
    return `<tr ${bg}>${cells}</tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><title>${config.title || "Tabell"}</title>
<style>body{font-family:Inter,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}</style>
</head>
<body>
${config.title ? `<h2 style="margin-bottom:4px">${config.title}</h2>` : ""}
${config.subtitle ? `<p style="color:#6b7280;font-size:14px;margin-bottom:16px">${config.subtitle}</p>` : ""}
<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;
}

export default function TableGenerator() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [dataSource, setDataSource] = useState("file");
  const [activeTab, setActiveTab] = useState("preview");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedChartId, setSavedChartId] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleDataLoaded = useCallback(({ data: d, columns: c, title }) => {
    setData(d);
    setColumns(c);
    if (title) setConfig(prev => ({ ...prev, title: prev.title || title }));
  }, []);

  const handleReset = () => {
    setData(null);
    setColumns([]);
    setConfig(DEFAULT_CONFIG);
    setSavedChartId(null);
  };

  // Load saved table from ?load= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get("load");
    if (!loadId) return;
    base44.entities.SavedChart.get(loadId).then((saved) => {
      if (!saved || saved.chart_type !== "table") return;
      setSavedChartId(saved.id);
      if (saved.chart_config) {
        const { _rawData, _columns, ...cleanConfig } = saved.chart_config;
        setConfig(cleanConfig);
        if (_rawData && _columns) {
          setData(_rawData);
          setColumns(_columns);
        }
      }
    });
  }, []);

  const handleSave = async () => {
    if (!data || !config.title?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: config.title,
        chart_config: { ...config, _rawData: data, _columns: columns },
        chart_type: "table",
        hc_config: null,
      };
      if (savedChartId) {
        await base44.entities.SavedChart.update(savedChartId, payload);
      } else {
        const created = await base44.entities.SavedChart.create(payload);
        setSavedChartId(created.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Lagring feilet: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const htmlOutput = data ? buildTableHtml(data, columns, config) : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Table2 className="w-[18px] h-[18px] text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">Tabell</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/saved">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
                <BookMarked className="w-3.5 h-3.5" />Mine grafer
              </Button>
            </Link>
            {data && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !config.title?.trim()}
                title={!config.title?.trim() ? "Tittel er obligatorisk" : undefined}
                className={`gap-1.5 text-xs h-8 transition-all ${saveSuccess ? "bg-green-600 hover:bg-green-600" : ""}`}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Lagrer…" : saveSuccess ? "Lagret!" : "Lagre tabell"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3.5 h-3.5" />Reset
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <ArrowLeft className="w-3.5 h-3.5" />Ny statistikkvisning
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-6 py-4 flex flex-col lg:flex-row gap-4">
        {/* Left panel */}
        <aside className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0 space-y-3">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datakilde</h2>
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-medium">
                <button
                  onClick={() => setDataSource("file")}
                  className={`px-2.5 py-1 transition-colors ${dataSource === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >Fil</button>
                <button
                  onClick={() => setDataSource("api")}
                  className={`px-2.5 py-1 transition-colors ${dataSource === "api" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >API</button>
              </div>
            </div>
            {dataSource === "file" && <FileUploader onDataLoaded={handleDataLoaded} />}
            {dataSource === "api" && <ApiDataImporter onDataLoaded={handleDataLoaded} onIndicatorSelected={() => {}} />}
            {data && <DataTable data={data} columns={columns} />}
          </div>

          {data && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />Konfigurasjon
              </h2>
              <TableConfig config={config} onChange={setConfig} columns={columns} />
            </motion.div>
          )}
        </aside>

        {/* Right panel */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {data && (
            <div className="flex items-center gap-1 p-1 bg-card rounded-xl border border-border w-fit shadow-sm">
              {[
                { id: "preview", label: "Forhåndsvisning", icon: Eye },
                { id: "html", label: "HTML-kode", icon: Code2 },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === t.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <AnimatePresence mode="wait">
              {!data ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground"
                >
                  <div className="p-4 rounded-2xl bg-muted/50">
                    <Table2 className="w-10 h-10 opacity-30" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Ingen data lastet opp ennå</p>
                    <p className="text-xs mt-1 opacity-70">Last opp en CSV, Excel eller JSON-fil for å starte</p>
                  </div>
                </motion.div>
              ) : activeTab === "preview" ? (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-auto">
                  <TablePreview data={data} columns={columns} config={config} />
                </motion.div>
              ) : (
                <motion.div key="html" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HTML-kode</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(htmlOutput); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {copied ? "Kopiert!" : "Kopier"}
                    </button>
                  </div>
                  <pre className="flex-1 overflow-auto rounded-xl bg-muted/50 p-4 text-[11px] font-mono text-foreground/80 whitespace-pre-wrap">
                    {htmlOutput}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}