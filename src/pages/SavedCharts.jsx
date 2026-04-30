import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Trash2, ArrowLeft, RefreshCw, Pencil, Globe, GlobeLock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Highcharts from "highcharts";

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

export default function SavedCharts() {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const navigate = useNavigate();

  const handleToggleApi = async (chart) => {
    setToggling(chart.id);
    const newVal = !chart.exposed_in_api;
    await base44.entities.SavedChart.update(chart.id, { exposed_in_api: newVal });
    setCharts(prev => prev.map(c => c.id === chart.id ? { ...c, exposed_in_api: newVal } : c));
    setToggling(null);
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
                <Settings className="w-3.5 h-3.5" />
                API
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={load} className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
              Oppdater
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <ArrowLeft className="w-3.5 h-3.5" />
                Tilbake
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 py-6">
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {charts.map(chart => (
              <div key={chart.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 pb-2">
                  <MiniChart hcConfig={chart.hc_config} />
                </div>
                {/* API exposure badge */}
                {chart.exposed_in_api && (
                  <div className="mx-4 mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 w-fit">
                    <Globe className="w-3 h-3 text-green-600" />
                    <span className="text-[11px] text-green-700 font-medium">Eksponert i API</span>
                  </div>
                )}

                <div className="px-4 pb-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{chart.title || "Uten tittel"}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{chart.chart_type} · {new Date(chart.created_date).toLocaleDateString("nb-NO")}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 transition-colors ${chart.exposed_in_api ? "text-green-600 hover:text-muted-foreground" : "text-muted-foreground hover:text-green-600"}`}
                      onClick={() => handleToggleApi(chart)}
                      disabled={toggling === chart.id}
                      title={chart.exposed_in_api ? "Skjul fra API" : "Eksponer i API"}
                    >
                      {chart.exposed_in_api ? <Globe className="w-4 h-4" /> : <GlobeLock className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => { window.location.href = `/?load=${chart.id}`; }}
                      title="Åpne og rediger"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(chart.id)}
                      disabled={deleting === chart.id}
                      title="Slett"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}