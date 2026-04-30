import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { detectColumns } from "@/lib/chartUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Globe, Loader2, AlertCircle, CheckCircle2, Plus, X } from "lucide-react";

const PRESET_ENDPOINTS = [
  {
    label: "Koronastatistikk – smittetilfeller",
    url: "https://statistikk.fhi.no/api/msis/cases",
    description: "Daglige smittetilfeller fra MSIS"
  },
  {
    label: "Helsedirektoratet – sykehusinnleggelser",
    url: "https://statistikk.helsedirektoratet.no/api/v1/data/sykehus",
    description: "Innleggelsesdata per måned"
  },
  {
    label: "Helsedirektoratet – legemiddelstatistikk",
    url: "https://statistikk.helsedirektoratet.no/api/v1/legemidler",
    description: "Legemiddelbruk per ATC-gruppe"
  },
  {
    label: "Norgeshelsa – folkehelse",
    url: "https://statistikkbank.fhi.no/api/v1/data",
    description: "Folkehelseprofil-data"
  },
];

function flattenJson(obj, prefix = "") {
  const rows = [];
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (typeof item === "object" && item !== null) {
        rows.push(flattenObject(item));
      }
    });
  } else if (typeof obj === "object" && obj !== null) {
    // Try to find an array inside the object
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === "object") {
        return flattenJson(obj[key]);
      }
    }
    rows.push(flattenObject(obj));
  }
  return rows;
}

function flattenObject(obj, prefix = "", depth = 0) {
  if (depth > 3) return {};
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, fullKey, depth + 1));
    } else if (!Array.isArray(val)) {
      result[fullKey] = val;
    }
  }
  return result;
}

export default function ApiDataImporter({ onDataLoaded }) {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [customHeaders, setCustomHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawJson, setRawJson] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showHeadersForm, setShowHeadersForm] = useState(false);
  const [success, setSuccess] = useState(false);

  const addHeader = () => setCustomHeaders(h => [...h, { key: "", value: "" }]);
  const removeHeader = (i) => setCustomHeaders(h => h.filter((_, j) => j !== i));
  const updateHeader = (i, field, val) => setCustomHeaders(h => h.map((row, j) => j === i ? { ...row, [field]: val } : row));

  const handleFetch = async () => {
    if (!url.trim()) { setError("Lim inn en URL først."); return; }
    setLoading(true);
    setError(null);
    setRawJson(null);
    setSuccess(false);

    const headers = {};
    if (apiKey.trim()) headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    if (apiKey.trim() && !apiKey.startsWith("Bearer")) headers["x-api-key"] = apiKey.trim();
    customHeaders.forEach(h => { if (h.key.trim()) headers[h.key.trim()] = h.value; });

    try {
      const response = await base44.functions.invoke("fetchApiData", { url: url.trim(), headers });
      const result = response.data;

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setRawJson(result.data);

      // Flatten and detect columns
      const rows = flattenJson(result.data);
      if (!rows || rows.length === 0) {
        setError("Kunne ikke finne tabelldata i responsen. Prøv et annet endepunkt eller sjekk strukturen under 'Vis rådata'.");
        setShowRaw(true);
        setLoading(false);
        return;
      }

      const cols = detectColumns(rows);
      setSuccess(true);
      onDataLoaded({ data: rows, columns: cols, source: "helsedirektoratet" });
    } catch (e) {
      setError(e.message || "Ukjent feil ved henting av data.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      {/* Preset selector */}
      <div>
        <button
          onClick={() => setShowPresets(v => !v)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          {showPresets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Forhåndsdefinerte endepunkter
        </button>
        {showPresets && (
          <div className="mt-2 space-y-1.5 rounded-xl border border-border bg-muted/30 p-2">
            {PRESET_ENDPOINTS.map((ep, i) => (
              <button
                key={i}
                onClick={() => { setUrl(ep.url); setShowPresets(false); setError(null); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/60 transition-colors"
              >
                <p className="text-xs font-medium text-foreground">{ep.label}</p>
                <p className="text-[11px] text-muted-foreground">{ep.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* URL input */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">API-endepunkt URL</Label>
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://statistikk.helsedirektoratet.no/api/..."
          className="h-8 text-xs font-mono"
        />
      </div>

      {/* API key */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">API-nøkkel (valgfritt)</Label>
        <Input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Bearer token eller API-nøkkel"
          className="h-8 text-xs"
        />
      </div>

      {/* Custom headers */}
      <div>
        <button
          onClick={() => setShowHeadersForm(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showHeadersForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Egendefinerte headers
        </button>
        {showHeadersForm && (
          <div className="mt-2 space-y-1.5">
            {customHeaders.map((h, i) => (
              <div key={i} className="flex gap-1.5">
                <Input value={h.key} onChange={e => updateHeader(i, "key", e.target.value)} placeholder="Header" className="h-7 text-xs" />
                <Input value={h.value} onChange={e => updateHeader(i, "value", e.target.value)} placeholder="Verdi" className="h-7 text-xs" />
                <button onClick={() => removeHeader(i)} className="px-1.5 text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button onClick={addHeader} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
              <Plus className="w-3.5 h-3.5" /> Legg til header
            </button>
          </div>
        )}
      </div>

      {/* Fetch button */}
      <Button onClick={handleFetch} disabled={loading} className="w-full h-8 text-xs gap-1.5">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
        {loading ? "Henter data..." : "Hent data fra API"}
      </Button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          Data lastet inn. Konfigurer grafen nedenfor.
        </div>
      )}

      {/* Raw JSON preview */}
      {rawJson && (
        <div>
          <button
            onClick={() => setShowRaw(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Vis rådata (JSON)
          </button>
          {showRaw && (
            <div className="mt-2 rounded-xl border border-border bg-[hsl(222,47%,8%)] overflow-auto max-h-48">
              <pre className="text-[0.65rem] text-[hsl(210,40%,80%)] p-3 font-mono">
                {JSON.stringify(rawJson, null, 2).slice(0, 3000)}
                {JSON.stringify(rawJson, null, 2).length > 3000 ? "\n... (avkortet)" : ""}
              </pre>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Data hentes via sikker proxy. Kilde vises automatisk i HTML-eksport.
      </p>
    </div>
  );
}