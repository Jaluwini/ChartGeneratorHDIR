import { useState, useRef, useCallback, useEffect } from "react";
import { buildHighchartsConfig, DEFAULT_COLORS, suggestChartConfig } from "@/lib/chartUtils";
import FileUploader from "@/components/chart/FileUploader";
import DataTable from "@/components/chart/DataTable";
import ChartConfig from "@/components/chart/ChartConfig";
import ChartPreview from "@/components/chart/ChartPreview";
import ExportPanel from "@/components/chart/ExportPanel";
import ApiDataImporter from "@/components/chart/ApiDataImporter";
import ApiFieldPicker from "@/components/chart/ApiFieldPicker";
import { Button } from "@/components/ui/button";
import { RefreshCw, BarChart3, Eye, Code2, AlertCircle, Save, BookMarked } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const DEFAULT_CONFIG = {
  chartType: "column",
  xAxis: null,
  yAxes: [],
  groupBy: "none",
  title: "",
  subtitle: "",
  xAxisTitle: "",
  yAxisTitle: "",
  colors: DEFAULT_COLORS,
  dataLabels: false,
  legend: true,
  sortData: "none",
  decimals: 0,
  height: 420,
  width: null,
  tooltipFormat: ""
};

const PREVIEW_TABS = [
{ id: "preview", label: "Preview", icon: Eye },
{ id: "export", label: "JSON / HTML", icon: Code2 }];


export default function ChartGenerator() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState("preview");
  const [validationError, setValidationError] = useState(null);
  const [dataSource, setDataSource] = useState("api"); // "file" | "api"
  const [apiSource, setApiSource] = useState(null); // "helsedirektoratet" etc.
  const [selectedIndicator, setSelectedIndicator] = useState(null); // { id, tittel, jsonUrl }
  const chartRef = useRef(null);

  const handleDataLoaded = useCallback(({ data: newData, columns: newCols, source, title, savedJsonUrl, savedMeasureType, savedEnhetType }) => {
    setData(newData);
    setColumns(newCols);
    if (source) setApiSource(source);
    const suggested = suggestChartConfig(newCols);
    setConfig((prev) => ({
      ...prev,
      xAxis: suggested.xAxis,
      yAxes: suggested.yAxes,
      chartType: suggested.chartType || prev.chartType,
      // Don't overwrite title if it's locked to API (ApiFieldPicker handles it)
      title: prev.titleFromApi ? prev.title : title || prev.title,
      // Store API filter selections so getChart can rebuild from fresh data
      ...(savedJsonUrl ? { savedJsonUrl, savedMeasureType, savedEnhetType } : {})
    }));
    setValidationError(null);
  }, []);

  const hcConfig = (() => {
    if (!data || !config.xAxis || !config.yAxes?.length) return null;
    const result = buildHighchartsConfig(config, data);
    return result;
  })();

  const validate = () => {
    if (!data) return "Please upload data first.";
    if (!config.xAxis) return "Please select an X-axis column.";
    if (!config.yAxes || config.yAxes.length === 0) return "Please select at least one Y-value column.";
    if (!hcConfig) return "Could not build chart configuration. Check your data mapping.";
    return null;
  };

  const handleReset = () => {
    setData(null);
    setColumns([]);
    setConfig(DEFAULT_CONFIG);
    setValidationError(null);
    setApiSource(null);
    setSelectedIndicator(null);
    setSavedChartId(null);
    chartRef.current = null;
  };

  const handleChartReady = (chart) => {
    chartRef.current = chart;
  };

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedChartId, setSavedChartId] = useState(null);

  // Load a saved chart by ID from URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get("load");
    if (!loadId) return;
    base44.entities.SavedChart.get(loadId).then((saved) => {
      if (!saved) return;
      setSavedChartId(saved.id);
      setApiSource(saved.api_source || null);
      if (saved.chart_config) {
        setConfig(saved.chart_config);
      }
      // Reconstruct data rows from hc_config series so preview and config panel work
      if (saved.hc_config && saved.chart_config) {
        const hc = saved.hc_config;
        const categories = hc.xAxis?.categories || [];
        const series = hc.series || [];
        const rows = categories.map((cat, i) => {
          const row = { [saved.chart_config.xAxis || "Kategori"]: cat };
          series.forEach((s) => {
            row[s.name] = s.data?.[i] ?? null;
          });
          return row;
        });
        const cols = [
        { name: saved.chart_config.xAxis || "Kategori", type: "string" },
        ...series.map((s) => ({ name: s.name, type: "number" }))];

        setData(rows);
        setColumns(cols);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!hcConfig) return;
    setSaving(true);
    try {
      // Strip raw data rows from config before saving to avoid payload size issues
      const { savedJsonUrl, savedMeasureType, savedEnhetType, ...configToSave } = config;
      const chartConfigToSave = {
        ...configToSave,
        ...(savedJsonUrl ? { savedJsonUrl, savedMeasureType, savedEnhetType } : {})
      };

      if (savedChartId) {
        await base44.entities.SavedChart.update(savedChartId, {
          title: config.title || "Uten tittel",
          hc_config: hcConfig,
          chart_config: chartConfigToSave,
          api_source: apiSource,
          chart_type: config.chartType
        });
      } else {
        const created = await base44.entities.SavedChart.create({
          title: config.title || "Uten tittel",
          hc_config: hcConfig,
          chart_config: chartConfigToSave,
          api_source: apiSource,
          chart_type: config.chartType
        });
        setSavedChartId(created.id);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Lagring feilet: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="w-4.5 h-4.5 text-primary w-[18px] h-[18px]" />
            </div>
            <div>
              <span className="font-semibold text-sm text-foreground">ChartGenerator</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2"></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/saved">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
                <BookMarked className="w-3.5 h-3.5" />
                Mine grafer
              </Button>
            </Link>
            {hcConfig &&
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className={`gap-1.5 text-xs h-8 transition-all ${saveSuccess ? "bg-green-600 hover:bg-green-600" : ""}`}>
              
                <Save className="w-3.5 h-3.5" />
                {saving ? "Lagrer…" : saveSuccess ? "Lagret!" : "Lagre graf"}
              </Button>
            }
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
              
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-6 py-4 flex flex-col lg:flex-row gap-4">
        {/* Left panel */}
        <aside className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0 space-y-3">
          {/* Upload section */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Source</h2>
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-medium">
                <button
                  onClick={() => setDataSource("file")}
                  className={`px-2.5 py-1 transition-colors ${dataSource === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  
                  Fil
                </button>
                <button
                  onClick={() => setDataSource("api")}
                  className={`px-2.5 py-1 transition-colors ${dataSource === "api" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  
                  API
                </button>
              </div>
            </div>
            {dataSource === "file" && <FileUploader onDataLoaded={handleDataLoaded} />}
            {dataSource === "api" &&
            <ApiDataImporter
              onDataLoaded={handleDataLoaded}
              onIndicatorSelected={setSelectedIndicator} />

            }
              {dataSource === "api" && selectedIndicator &&
            <ApiFieldPicker
              jsonUrl={selectedIndicator.jsonUrl}
              config={config}
              onChange={setConfig} />

            }
            {data && <DataTable data={data} columns={columns} />}
          </div>

          {/* Config section */}
          {data &&
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Chart Configuration</h2>
              <ChartConfig config={config} onChange={setConfig} columns={columns} hideLabels={dataSource === "api" && !!selectedIndicator} />
            </motion.div>
          }
        </aside>

        {/* Right panel */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Validation error */}
          <AnimatePresence>
            {validationError &&
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
              
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {validationError}
              </motion.div>
            }
          </AnimatePresence>

          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 bg-card rounded-xl border border-border w-fit shadow-sm">
            {PREVIEW_TABS.map((t) =>
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${activeTab === t.id ?
              "bg-primary text-primary-foreground shadow-sm" :
              "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`
              }>
              
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )}
          </div>

          {/* Preview area */}
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === "preview" &&
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 md:p-6">
                
                  <ChartPreview hcConfig={hcConfig} onChartReady={handleChartReady} />
                </motion.div>
              }
              {activeTab === "export" &&
              <motion.div
                key="export"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 md:p-6 h-full min-h-[500px] flex flex-col">
                
                  <ExportPanel hcConfig={hcConfig} chartRef={chartRef} apiSource={apiSource} savedChartId={savedChartId} />
                </motion.div>
              }
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>);

}