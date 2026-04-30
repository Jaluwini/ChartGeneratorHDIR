import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowLeft, Globe } from "lucide-react";
import { Link } from "react-router-dom";

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 h-7 text-xs">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Kopiert!" : label}
    </Button>
  );
}

export default function ApiSettings() {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const all = await base44.entities.SavedChart.list();
      const exposed = all.filter(c => c.exposed_in_api);
      setCharts(exposed);
      setLoading(false);
    };
    load();
  }, []);

  const appId = "69f308f7754a9d73da3f8a17";
  const apiBase = `https://api.base44.app/api/apps/${appId}/functions/getChart`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/saved">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-sm text-foreground">API Innstillinger</h1>
              <p className="text-xs text-muted-foreground">Test og konfigurer eksporterte grafer</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
            Laster…
          </div>
        ) : charts.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Ingen grafer eksponert i API</p>
            <p className="text-xs text-muted-foreground mt-1">Gå til «Mine grafer» og aktiver API-eksponering.</p>
          </div>
        ) : (
          <>
            {/* List endpoint */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Alle eksponerte grafer</h2>
                <p className="text-xs text-muted-foreground mt-1">Hent liste over alle tilgjengelige grafer</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">GET Endpoint</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                  <code className="text-xs font-mono text-foreground flex-1 break-all">{apiBase}</code>
                  <CopyButton text={apiBase} label="Kopier" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">cURL</p>
                <div className="rounded-lg border border-border overflow-auto bg-[hsl(222,47%,8%)]">
                  <pre className="code-block text-[hsl(210,40%,85%)] p-3 text-[0.7rem]">{`curl -X GET "${apiBase}"`}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">JavaScript</p>
                <div className="rounded-lg border border-border overflow-auto bg-[hsl(222,47%,8%)]">
                  <pre className="code-block text-[hsl(210,40%,85%)] p-3 text-[0.7rem]">{`const res = await fetch("${apiBase}");
      const { charts } = await res.json();
      console.log(charts); // [{ id, title, chart_type, ... }]`}</pre>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                <p className="font-medium text-foreground mb-2">Response: Array med grafer</p>
                <p><code className="font-mono text-[11px]">id</code> - Brukes for å hente detaljer</p>
                <p><code className="font-mono text-[11px]">title</code> - Grafens tittel</p>
                <p><code className="font-mono text-[11px]">chart_type</code> - Type (column, line, etc.)</p>
                <p><code className="font-mono text-[11px]">created_date, updated_date</code> - Datoer</p>
              </div>
            </div>

            {/* Specific chart endpoint documentation */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Hent spesifikk graf</h2>
                <p className="text-xs text-muted-foreground mt-1">Spør på endepunktet med graf-ID for å hente JSON-data</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">GET Endpoint</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                  <code className="text-xs font-mono text-foreground flex-1 break-all">{apiBase}?id=CHART_ID</code>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">cURL</p>
                <div className="rounded-lg border border-border overflow-auto bg-[hsl(222,47%,8%)]">
                  <pre className="code-block text-[hsl(210,40%,85%)] p-3 text-[0.7rem]">{`curl -X GET "${apiBase}?id=CHART_ID"`}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">JavaScript</p>
                <div className="rounded-lg border border-border overflow-auto bg-[hsl(222,47%,8%)]">
                  <pre className="code-block text-[hsl(210,40%,85%)] p-3 text-[0.7rem]">{`const res = await fetch("${apiBase}?id=CHART_ID");
const hc_config = await res.json();
Highcharts.chart("container", hc_config);`}</pre>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                <p className="font-medium text-foreground mb-2">Response: Highcharts-konfigurasjon</p>
                <p>Responsen er en komplett Highcharts-konfigurasjon som er klar til bruk. Bytt <code className="font-mono text-[11px] bg-foreground/10 px-1 rounded">CHART_ID</code> med ID-en på grafen du vil hente.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}