import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Trash2, ArrowLeft, RefreshCw, Pencil, Globe, GlobeLock, Settings, Maximize2, X, Search, FolderOpen, Folder, FolderPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Highcharts from "highcharts";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportData from "highcharts/modules/export-data";
import HighchartsOfflineExporting from "highcharts/modules/offline-exporting";

HighchartsExporting(Highcharts);
HighchartsExportData(Highcharts);
HighchartsOfflineExporting(Highcharts);

function MiniChart({ hcConfig }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !hcConfig) return;
    const chart = Highcharts.chart(containerRef.current, {
      ...hcConfig,
      chart: { ...hcConfig.chart, height: 200, width: undefined, animation: false },
      title: { text: "" },
      subtitle: { text: "" },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: { enabled: false },
    });
    return () => chart.destroy();
  }, [hcConfig]);

  if (!hcConfig) return <div className="h-[200px] bg-muted/40 rounded-lg flex items-center justify-center text-xs text-muted-foreground">Ingen konfigurasjon</div>;
  return <div ref={containerRef} />;
}

function FullscreenChart({ chart, onClose }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !chart.hc_config) return;
    const chart_ = Highcharts.chart(containerRef.current, {
      ...chart.hc_config,
      chart: { ...chart.hc_config.chart, height: null, width: null, animation: false },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ["downloadPNG", "downloadJPEG", "downloadSVG", "downloadPDF", "separator", "downloadCSV", "downloadXLS"]
          }
        }
      }
    });
    return () => chart_.destroy();
  }, [chart]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <span className="font-semibold text-sm text-foreground">{chart.title || "Uten tittel"}</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 p-6" />
    </div>
  );
}

function FolderBadge({ folder, onEdit }) {
  return (
    <button
      onClick={onEdit}
      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
      title="Endre mappe"
    >
      <Folder className="w-3 h-3" />
      {folder}
    </button>
  );
}

function FolderEditor({ chart, folders, onSave, onClose }) {
  const [value, setValue] = useState(chart.folder || "");
  const [custom, setCustom] = useState("");

  const handleSave = (v) => {
    onSave(v.trim());
    onClose();
  };

  return (
    <div className="absolute inset-0 z-10 bg-card/95 backdrop-blur-sm rounded-2xl flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Velg mappe</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => handleSave("")}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${!value ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-secondary"}`}
        >
          Ingen mappe
        </button>
        {folders.filter(f => f).map(f => (
          <button
            key={f}
            onClick={() => { setValue(f); handleSave(f); }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${value === f ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-secondary"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ny mappenavn…"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && custom.trim() && handleSave(custom)}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button size="sm" className="h-7 text-xs px-3" onClick={() => custom.trim() && handleSave(custom)} disabled={!custom.trim()}>
          <Check className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function SavedCharts() {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [editingFolderFor, setEditingFolderFor] = useState(null);
  const [search, setSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState(null); // null = alle
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const res = await base44.entities.SavedChart.list("-created_date");
    setCharts(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    setDeleting(id);
    await base44.entities.SavedChart.delete(id);
    setCharts(prev => prev.filter(c => c.id !== id));
    setDeleting(null);
  };

  const handleToggleApi = async (chart) => {
    setToggling(chart.id);
    const newVal = !chart.exposed_in_api;
    await base44.entities.SavedChart.update(chart.id, { exposed_in_api: newVal });
    setCharts(prev => prev.map(c => c.id === chart.id ? { ...c, exposed_in_api: newVal } : c));
    setToggling(null);
  };

  const handleSaveFolder = async (chart, folder) => {
    await base44.entities.SavedChart.update(chart.id, { folder: folder || null });
    setCharts(prev => prev.map(c => c.id === chart.id ? { ...c, folder: folder || null } : c));
    setEditingFolderFor(null);
  };

  // All unique folders
  const folders = [...new Set(charts.map(c => c.folder).filter(Boolean))].sort();

  // Filter by search + folder
  const filtered = charts.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.folder?.toLowerCase().includes(search.toLowerCase());
    const matchFolder = activeFolder === null || c.folder === activeFolder;
    return matchSearch && matchFolder;
  });

  // Group by folder for display
  const noFolder = filtered.filter(c => !c.folder);
  const byFolder = folders.reduce((acc, f) => {
    const items = filtered.filter(c => c.folder === f);
    if (items.length > 0) acc[f] = items;
    return acc;
  }, {});

  const ChartCard = ({ chart }) => {
    const isEditingFolder = editingFolderFor === chart.id;
    return (
    <div key={chart.id} className="relative bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {isEditingFolder && (
        <FolderEditor
          chart={chart}
          folders={folders}
          onSave={(folder) => handleSaveFolder(chart, folder)}
          onClose={() => setEditingFolderFor(null)}
        />
      )}
      <div className="p-4 pb-2">
        <MiniChart hcConfig={chart.hc_config} />
      </div>
      <div className="mx-4 mb-2 flex items-center gap-2 flex-wrap">
        {chart.exposed_in_api && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
            <Globe className="w-3 h-3 text-green-600" />
            <span className="text-[11px] text-green-700 font-medium">API</span>
          </div>
        )}
        {chart.folder
          ? <FolderBadge folder={chart.folder} onEdit={() => setEditingFolderFor(chart.id)} />
          : (
            <button
              onClick={() => setEditingFolderFor(chart.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <FolderPlus className="w-3 h-3" />
              Legg til mappe
            </button>
          )
        }
      </div>
      <div className="px-4 pb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{chart.title || "Uten tittel"}</p>
          <p className="text-[11px] text-muted-foreground capitalize">{chart.chart_type} · {new Date(chart.created_date).toLocaleDateString("nb-NO")}</p>
          <p className="text-[10px] text-muted-foreground/70 font-mono mt-1 truncate">ID: {chart.id}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className={`h-8 w-8 transition-colors ${chart.exposed_in_api ? "text-green-600 hover:text-muted-foreground" : "text-muted-foreground hover:text-green-600"}`}
            onClick={() => handleToggleApi(chart)} disabled={toggling === chart.id} title={chart.exposed_in_api ? "Skjul fra API" : "Eksponer i API"}>
            {chart.exposed_in_api ? <Globe className="w-4 h-4" /> : <GlobeLock className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => setFullscreenChart(chart)} title="Fullskjerm">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => { window.location.href = chart.chart_type === "barometer" ? `/barometer?load=${chart.id}` : `/?load=${chart.id}`; }} title="Åpne og rediger">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(chart.id)} disabled={deleting === chart.id} title="Slett">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {fullscreenChart && <FullscreenChart chart={fullscreenChart} onClose={() => setFullscreenChart(null)} />}

      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="w-[18px] h-[18px] text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">Lagrede grafer</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/api-settings">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
                <Settings className="w-3.5 h-3.5" />API
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={load} className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3.5 h-3.5" />Oppdater
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <ArrowLeft className="w-3.5 h-3.5" />Tilbake
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 py-6 space-y-4">
        {/* Search + folder filter */}
        {!loading && charts.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Søk i grafer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {folders.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setActiveFolder(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${activeFolder === null ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                >
                  Alle
                </button>
                {folders.map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFolder(activeFolder === f ? null : f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${activeFolder === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                  >
                    <FolderOpen className="w-3 h-3" />
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-xs text-muted-foreground gap-2">
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            Laster grafer…
          </div>
        ) : charts.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Ingen lagrede grafer ennå.</p>
            <Link to="/"><Button size="sm" variant="outline" className="gap-1.5 text-xs">Lag en graf</Button></Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">Ingen grafer matchet søket.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Charts in folders */}
            {Object.entries(byFolder).map(([folder, items]) => (
              <div key={folder}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">{folder}</h2>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map(chart => <ChartCard key={chart.id} chart={chart} />)}
                </div>
              </div>
            ))}

            {/* Charts without folder */}
            {noFolder.length > 0 && (
              <div>
                {folders.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-muted-foreground">Uten mappe</h2>
                    <span className="text-xs text-muted-foreground">({noFolder.length})</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {noFolder.map(chart => <ChartCard key={chart.id} chart={chart} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}