import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { BarChart3, BookMarked, Upload, RefreshCw, Save, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import BarometerUploader from "@/components/barometer/BarometerUploader";
import BarometerConfig from "@/components/barometer/BarometerConfig";
import BarometerChart from "@/components/barometer/BarometerChart";
import { buildBarometerConfig } from "@/lib/barometerUtils";
import { base44 } from "@/api/base44Client";

const DEFAULT_CONFIG = {
  title: "",
  subtitle: "",
  colIndicator: "",
  colValue: "",
  colReference: "",
  colMin: "",
  colMax: "",
  colUnit: "",
  colPeriod: "",
  colTheme: "",
  colColor: "",
  showReferenceBar: true,
  referenceLineFixed: null,
  colorMode: "relative",
  thresholdGood: 5,
  thresholdBad: -5,
  higherIsBetter: true,
  colorGood: "#22c55e",
  colorNeutral: "#f59e0b",
  colorBad: "#ef4444",
  colorMissing: "#ffffff",
  barColor: "#cccccc",
  referenceLineColor: "#cc0000",
  diamondSize: 8,
  height: null,
  valueSuffix: "",
  decimals: 1,
};

export default function BarometerGenerator() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleDataLoaded = useCallback(({ data: d, columns: c }) => {
    setData(d);
    setColumns(c);
    const find = (...keywords) => c.find(col => keywords.some(k => col.name.toLowerCase().includes(k)))?.name || "";
    setConfig(prev => ({
      ...prev,
      colIndicator: find("indikator", "navn", "name", "indicator", "title") || c[0]?.name || "",
      colValue: find("fylke", "verdi", "value", "oslo", "region") || c[1]?.name || "",
      colReference: find("norge", "nasjon", "national", "reference", "ref", "landsgj") || c[2]?.name || "",
      colMin: find("min", "lavest", "minimum") || "",
      colMax: find("max", "høyest", "maximum") || "",
      colUnit: find("enhet", "unit") || "",
      colPeriod: find("periode", "period", "år", "year") || "",
      colTheme: find("tema", "theme", "kategori", "category") || "",
      colColor: find("farge", "color", "colour", "status") || "",
    }));
  }, []);

  const hcConfig = data && config.colIndicator && config.colValue
    ? buildBarometerConfig(config, data)
    : null;

  const handleReset = () => {
    setData(null);
    setColumns([]);
    setConfig(DEFAULT_CONFIG);
  };

  const handleSave = async () => {
    if (!hcConfig || !config.title?.trim()) return;
    setSaving(true);
    try {
      await base44.entities.SavedChart.create({
        title: config.title,
        hc_config: hcConfig,
        chart_config: config,
        chart_type: "barometer",
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Lagring feilet: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm text-foreground">Folkehelsebarometer</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">— barometer-visualisering</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/saved">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
                <BookMarked className="w-3.5 h-3.5" />
                Mine grafer
              </Button>
            </Link>
            {hcConfig && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !config.title?.trim()}
                title={!config.title?.trim() ? "Tittel er obligatorisk" : undefined}
                className={`gap-1.5 text-xs h-8 transition-all ${saveSuccess ? "bg-green-600 hover:bg-green-600" : ""}`}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Lagrer…" : saveSuccess ? "Lagret!" : "Lagre"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                ChartGenerator
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-6 py-4 flex flex-col lg:flex-row gap-4">
        {/* Left panel */}
        <aside className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0 space-y-3">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Last opp data
            </h2>
            <BarometerUploader onDataLoaded={handleDataLoaded} />
          </div>

          {data && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Konfigurasjon</h2>
              <BarometerConfig config={config} onChange={setConfig} columns={columns} />
            </motion.div>
          )}

          {/* Format guide */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forventet dataformat</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Last opp CSV eller JSON med kolonner som beskriver indikatorverdier. Anbefalte kolonnenavn:
            </p>
            <div className="font-mono text-[10px] bg-muted/50 rounded-lg p-2.5 space-y-0.5 text-muted-foreground">
              <div><span className="text-foreground font-semibold">indikator</span> — navn på indikator</div>
              <div><span className="text-foreground font-semibold">fylke</span> — verdi for fylket/kommunen</div>
              <div><span className="text-foreground font-semibold">norge</span> — nasjonal referanseverdi</div>
              <div><span className="text-foreground font-semibold">min</span> — laveste fylkesverdi i landet</div>
              <div><span className="text-foreground font-semibold">max</span> — høyeste fylkesverdi i landet</div>
              <div><span className="text-foreground font-semibold">enhet</span> — f.eks. prosent, per 1000</div>
              <div><span className="text-foreground font-semibold">periode</span> — f.eks. 2024, 2022-2024</div>
              <div><span className="text-foreground font-semibold">tema</span> — grupperingskolonne (valgfri)</div>
            </div>
            <button
              className="text-[11px] text-primary underline underline-offset-2 hover:text-primary/80"
              onClick={() => {
                const csv = `indikator,fylke,norge,min,max,enhet,periode,tema
Andel i yrkesaktiv alder (16-66 år),72.1,65.9,58.2,76.3,prosent,2025,Befolkning
Andel over 80 år,3.4,4.8,2.1,7.2,prosent,2025,Befolkning
Persons som bor alene 45+,33.0,27.0,18.4,40.1,prosent,2024,Befolkning
Sysselsatte 20-66 år,76.7,76.9,68.3,82.1,prosent (a),2024,Oppvekst og levekår
Sykefraver legemeldt 20-66 år,5.0,5.9,3.8,8.1,prosent (a),2024,Oppvekst og levekår
Forventet levealder menn,81.7,81.4,79.2,83.1,år,2018-2024,Helsestatus
Forventet levealder kvinner,84.9,84.6,82.3,86.7,år,2018-2024,Helsestatus`;
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "barometer_eksempel.csv"; a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-3 h-3 inline mr-1" />Last ned eksempelfil (CSV)
            </button>
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {hcConfig ? (
              <motion.div
                key="chart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                <BarometerChart hcConfig={hcConfig} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 bg-card rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground"
              >
                <div className="p-4 rounded-2xl bg-muted/50">
                  <BarChart3 className="w-10 h-10 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Ingen data lastet opp ennå</p>
                  <p className="text-xs mt-1 opacity-70">Last opp en CSV eller JSON-fil for å starte</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}