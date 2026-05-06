import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table2, BookMarked, RefreshCw, Save, ArrowLeft, Eye, Code2, Maximize2, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import FileUploader from "@/components/chart/FileUploader";
import ApiDataImporter from "@/components/chart/ApiDataImporter";
import DataTable from "@/components/chart/DataTable";
import TableConfig from "@/components/table/TableConfig";
import TablePreview from "@/components/table/TablePreview";
import TableExportPanel from "@/components/table/TableExportPanel";
import TableEditor from "@/components/table/TableEditor";
import { base44 } from "@/api/base44Client";

const DEFAULT_CONFIG = {
  title: "",
  subtitle: "",
  sourceText: "",
  striped: true,
  compact: false,
  stickyHeader: true,
  showSearch: true,
  sortable: true,
  showRowNumbers: false,
  highlightNumbers: false,
  textAlign: "left",
  fontSize: "sm",
  pageSize: 0,
  visibleColumns: null,
  columnAliases: {},
  nowrap: false,
  headerBg: "#f4f4f5",
  headerText: "#111827",
  stripedColor: "#f9fafb",
  hoverColor: "#f3f4f6",
  borderColor: "#e5e7eb",
  tableBg: "#ffffff",
  numberColor: "#2563eb",
  conditionalFormat: false,
  cfColumn: "",
  cfHigh: "",
  cfLow: "",
  cfHighColor: "#dcfce7",
  cfMidColor: "#fef9c3",
  cfLowColor: "#fee2e2",
};

export default function TableGenerator() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [dataSource, setDataSource] = useState("file");
  const [activeTab, setActiveTab] = useState("preview");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedChartId, setSavedChartId] = useState(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get("load");
    if (!loadId) return;
    base44.entities.SavedChart.get(loadId).then((saved) => {
      if (!saved || saved.chart_type !== "table") return;
      setSavedChartId(saved.id);
      if (saved.chart_config) {
        const { _rawData, _columns, ...cleanConfig } = saved.chart_config;
        setConfig({ ...DEFAULT_CONFIG, ...cleanConfig });
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

  const [fullscreen, setFullscreen] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const TABS = [
    { id: "preview", label: "Forhåndsvisning", icon: Eye },
    { id: "export", label: "Eksport / API", icon: Code2 },
  ];

  return (
    <>
    {fullscreen && (
      <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-auto">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card sticky top-0">
          <span className="font-semibold text-sm text-foreground">{config.title || "Tabell"}</span>
          <button onClick={() => setFullscreen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <TablePreview data={data} columns={columns} config={config} />
        </div>
      </div>
    )}
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
        <aside className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0 space-y-3">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datakilde</h2>
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-medium">
                <button onClick={() => setDataSource("file")}
                  className={`px-2.5 py-1 transition-colors ${dataSource === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Fil</button>
                <button onClick={() => setDataSource("api")}
                  className={`px-2.5 py-1 transition-colors ${dataSource === "api" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>API</button>
              </div>
            </div>
            {dataSource === "file" && <FileUploader onDataLoaded={handleDataLoaded} />}
            {dataSource === "api" && <ApiDataImporter onDataLoaded={handleDataLoaded} onIndicatorSelected={() => {}} />}
            {data && <DataTable data={data} columns={columns} />}
          </div>

          {data && (
            <>
              <Button 
                size="sm" 
                onClick={() => setShowEditor(!showEditor)}
                variant={showEditor ? "default" : "outline"}
                className="gap-1.5 text-xs h-8 w-full"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {showEditor ? "Lukk redigering" : "Rediger data"}
              </Button>

              {showEditor && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl border border-border p-4 shadow-sm"
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Rediger tabelldata</h2>
                  <TableEditor data={data} columns={columns} onDataChange={setData} />
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border p-4 shadow-sm"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Konfigurasjon</h2>
                <TableConfig config={config} onChange={setConfig} columns={columns} />
              </motion.div>
            </>
          )}
        </aside>

        {/* Right panel */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {data && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 p-1 bg-card rounded-xl border border-border w-fit shadow-sm">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}>
                    <t.icon className="w-3.5 h-3.5" />{t.label}
                  </button>
                ))}
              </div>
              {activeTab === "preview" && (
                <button onClick={() => setFullscreen(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border">
                  <Maximize2 className="w-3.5 h-3.5" />Fullskjerm
                </button>
              )}
            </div>
          )}

          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <AnimatePresence mode="wait">
              {!data ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
                  <div className="p-4 rounded-2xl bg-muted/50"><Table2 className="w-10 h-10 opacity-30" /></div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Ingen data lastet opp ennå</p>
                    <p className="text-xs mt-1 opacity-70">Last opp en CSV, Excel eller JSON-fil, eller lim inn data fra Excel/Google Sheets</p>
                  </div>
                </motion.div>
              ) : activeTab === "preview" ? (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-auto">
                  <TablePreview data={data} columns={columns} config={config} />
                </motion.div>
              ) : (
                <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full min-h-[500px]">
                  <TableExportPanel data={data} columns={columns} config={config} savedChartId={savedChartId} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
    </>
  );
}