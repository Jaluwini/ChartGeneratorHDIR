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
            {/* API Documentation */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="font-semibold text-foreground">API Dokumentasjon</h2>
                  <p className="text-xs text-muted-foreground mt-1">Enhetlig API for både grafer og tabeller</p>
                </div>

                <div className="space-y-4">
                  {/* Main API Overview */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <h3 className="font-medium text-sm text-foreground">Unified Content API</h3>
                    <p className="text-xs text-muted-foreground">Samme endepunkt returnerer både Highcharts-konfigurasjoner og strukturerte tabelldata avhengig av innholdstypen.</p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Endepunkt</p>
                      <code className="block px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground break-all">{apiBase}</code>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parametere</p>
                      <div className="text-xs text-muted-foreground space-y-1 px-3 py-2 rounded-lg bg-muted/30">
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">id</code> - (valgfri) Innhold-ID. Hvis utelatt, returneres liste over alle eksponerte grafer og tabeller.</p>
                      </div>
                    </div>
                  </div>

                  {/* List All Exposed Items */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <h3 className="font-medium text-sm text-foreground">1. Hent liste over alt eksponert innhold</h3>
                    <p className="text-xs text-muted-foreground">Kall endepunktet uten ID-parameter for å se alle tilgjengelige grafer og tabeller.</p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Response Fields (Liste)</p>
                      <div className="text-xs text-muted-foreground space-y-1 px-3 py-2 rounded-lg bg-muted/30">
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">id</code> - Unik identifikator</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">title</code> - Navn på grafen eller tabellen</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">chart_type</code> - Type: <code className="font-mono">column</code>, <code className="font-mono">line</code>, <code className="font-mono">pie</code>, <code className="font-mono">table</code>, osv.</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">created_date, updated_date</code> - Tidsstempler</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">area</code> - Mappeorganisering</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eksempel: JavaScript</p>
                      <div className="rounded-lg border border-border overflow-auto bg-[hsl(222,47%,8%)]">
                        <pre className="code-block text-[hsl(210,40%,85%)] p-3 text-[0.7rem]">{`const res = await fetch("${apiBase}");
              const { charts } = await res.json();
              console.log(charts);
              // Returnerer alle grafer og tabeller som er eksponert`}</pre>
                      </div>
                    </div>
                  </div>

                  {/* Get Specific Chart */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <h3 className="font-medium text-sm text-foreground">2. Hent og vis spesifikk graf</h3>
                    <p className="text-xs text-muted-foreground">For innhold av type graf (column, line, pie, etc.) - returneres komplett Highcharts-konfigurasjon.</p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request</p>
                      <code className="block px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground break-all">{apiBase}?id=CHART_ID</code>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Response Fields</p>
                      <div className="text-xs text-muted-foreground space-y-1 px-3 py-2 rounded-lg bg-muted/30">
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">chart</code> - Type og innstillinger</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">title, subtitle</code> - Titler</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">xAxis, yAxis</code> - Akser og kategorier</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">series</code> - Dataserier</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">colors, legend, tooltip</code> - Styling og UI</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eksempel: Highcharts Integration</p>
                      <div className="rounded-lg border border-border overflow-auto bg-[hsl(222,47%,8%)]">
                        <pre className="code-block text-[hsl(210,40%,85%)] p-3 text-[0.7rem]">{`<script src="https://code.highcharts.com/highcharts.js"></script>
              <div id="chart-container"></div>
              <script>
              fetch("${apiBase}?id=CHART_ID")
              .then(res => res.json())
              .then(config => Highcharts.chart("chart-container", config));
              </script>`}</pre>
                      </div>
                    </div>
                  </div>

                  {/* Get Specific Table */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <h3 className="font-medium text-sm text-foreground">3. Hent og vis spesifikk tabell</h3>
                    <p className="text-xs text-muted-foreground">For innhold av type tabell - returneres strukturerte data med metadata.</p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request</p>
                      <code className="block px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground break-all">{apiBase}?id=TABLE_ID</code>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Response Fields</p>
                      <div className="text-xs text-muted-foreground space-y-1 px-3 py-2 rounded-lg bg-muted/30">
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">type</code> - Alltid <code className="font-mono">table</code></p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">meta.title, meta.subtitle</code> - Tabellens navn og beskrivelse</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">meta.columns</code> - Kolonnedefinisjoner med type</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">meta.total_rows</code> - Antall datarader</p>
                        <p><code className="font-mono bg-foreground/10 px-1 rounded">data</code> - Array av rader (objekter med kolonnenavn som keys)</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eksempel: JSON Fetch</p>
                      <div className="rounded-lg border border-border overflow-auto bg-[hsl(222,47%,8%)]">
                        <pre className="code-block text-[hsl(210,40%,85%)] p-3 text-[0.7rem]">{`fetch("${apiBase}?id=TABLE_ID")
              .then(res => res.json())
              .then(json => {
              console.log(json.meta.title);     // Tabelltittel
              console.log(json.meta.columns);   // Kolonner
              console.log(json.data);           // Datarader
              });`}</pre>
                      </div>
                    </div>
                  </div>

                  {/* Best Practices */}
                  <div className="border border-border rounded-lg p-4 space-y-3 bg-accent/30">
                    <h3 className="font-medium text-sm text-foreground">Beste Praksis</h3>
                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                      <li>Bruk liste-endepunktet først for å oppdage ID-er for det innholdet du trenger</li>
                      <li>Sjekk <code className="font-mono bg-foreground/10 px-1 rounded">chart_type</code> for å vite om du får Highcharts-config eller tabeldata</li>
                      <li>CORS er aktivert - alle kall kan gjøres direkte fra webleseren</li>
                      <li>Kun innhold markert som "Eksponert i API" er tilgjengelig</li>
                      <li>Data oppdateres automatisk når du endrer konfigurasjoner i applikasjonen</li>
                    </ul>
                  </div>
                </div>
              </div>
              </>
              )}
              </div>
              </div>
              );
              }