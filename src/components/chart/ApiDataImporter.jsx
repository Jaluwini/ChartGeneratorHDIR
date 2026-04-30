import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { detectColumns } from "@/lib/chartUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Globe, Loader2, AlertCircle, ArrowRight, RotateCcw } from "lucide-react";

// Tries to find all array-of-objects paths in a JSON structure
function findArrayPaths(obj, path = "", depth = 0) {
  if (depth > 5) return [];
  const results = [];
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
    results.push({ path: path || "(root)", count: obj.length, sample: obj[0] });
  } else if (typeof obj === "object" && obj !== null) {
    for (const key of Object.keys(obj)) {
      const child = obj[key];
      const childPath = path ? `${path}.${key}` : key;
      results.push(...findArrayPaths(child, childPath, depth + 1));
    }
  }
  return results;
}

function getAtPath(obj, path) {
  if (!path || path === "(root)") return obj;
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
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

// Step 1: URL form
function StepFetch({ onFetched }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFetch = async () => {
    if (!url.trim()) { setError("Lim inn en URL først."); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke("fetchApiData", { url: url.trim(), headers: {} });
      const result = response.data;
      if (result.error) { setError(result.error); setLoading(false); return; }
      onFetched(result.data);
    } catch (e) {
      setError(e.message || "Ukjent feil ved henting av data.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">API-endepunkt URL</Label>
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://api.eksempel.no/data"
          className="h-8 text-xs font-mono"
          onKeyDown={e => e.key === "Enter" && handleFetch()}
        />
      </div>

      <Button onClick={handleFetch} disabled={loading} className="w-full h-8 text-xs gap-1.5">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
        {loading ? "Henter data..." : "Hent data fra API"}
      </Button>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Step 2: Pick which array in the JSON to use
function StepPickArray({ rawJson, onPicked, onBack }) {
  const paths = findArrayPaths(rawJson);
  const [selected, setSelected] = useState(paths[0]?.path || "(root)");
  const [showRaw, setShowRaw] = useState(false);

  const handleUse = () => {
    const arr = getAtPath(rawJson, selected);
    if (!arr || !Array.isArray(arr)) return;
    const rows = arr.map(item => typeof item === "object" ? flattenObject(item) : { value: item });
    onPicked(rows, selected);
  };

  if (paths.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Responsen inneholder ingen array med objekter som kan brukes som tabelldata. Sjekk strukturen nedenfor og prøv et annet endepunkt.</span>
        </div>
        <button onClick={() => setShowRaw(v => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Vis rådata (JSON)
        </button>
        {showRaw && (
          <div className="rounded-xl border border-border bg-[hsl(222,47%,8%)] overflow-auto max-h-48">
            <pre className="text-[0.65rem] text-[hsl(210,40%,80%)] p-3 font-mono">
              {JSON.stringify(rawJson, null, 2).slice(0, 4000)}
            </pre>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onBack} className="w-full h-8 text-xs gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Prøv annet endepunkt
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        API-et returnerte data i {paths.length > 1 ? `${paths.length} arrays` : "én array"}. Velg hvilken du vil bruke som datakilde for grafen:
      </p>

      <div className="space-y-1.5">
        {paths.map((p, i) => (
          <button
            key={i}
            onClick={() => setSelected(p.path)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
              selected === p.path
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-foreground">{p.path}</span>
              <span className="text-[10px] text-muted-foreground">{p.count} rader</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              Felter: {Object.keys(p.sample).slice(0, 6).join(", ")}{Object.keys(p.sample).length > 6 ? "…" : ""}
            </p>
          </button>
        ))}
      </div>

      <button onClick={() => setShowRaw(v => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Vis rådata (JSON)
      </button>
      {showRaw && (
        <div className="rounded-xl border border-border bg-[hsl(222,47%,8%)] overflow-auto max-h-40">
          <pre className="text-[0.65rem] text-[hsl(210,40%,80%)] p-3 font-mono">
            {JSON.stringify(rawJson, null, 2).slice(0, 4000)}
          </pre>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="h-8 text-xs gap-1">
          <RotateCcw className="w-3.5 h-3.5" /> Tilbake
        </Button>
        <Button size="sm" onClick={handleUse} className="flex-1 h-8 text-xs gap-1.5">
          Bruk valgt data <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ApiDataImporter({ onDataLoaded }) {
  const [step, setStep] = useState("fetch"); // "fetch" | "pick"
  const [rawJson, setRawJson] = useState(null);

  const handleFetched = (data) => {
    setRawJson(data);
    setStep("pick");
  };

  const handlePicked = (rows, pathLabel) => {
    const cols = detectColumns(rows);
    onDataLoaded({ data: rows, columns: cols, source: "helsedirektoratet" });
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-3">
        {["fetch", "pick"].map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>{i + 1}</div>
            <span className={`text-[10px] ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s === "fetch" ? "Hent data" : "Velg datakilde"}
            </span>
            {i < 1 && <div className="w-4 h-px bg-border" />}
          </div>
        ))}
      </div>

      {step === "fetch" && <StepFetch onFetched={handleFetched} />}
      {step === "pick" && (
        <StepPickArray
          rawJson={rawJson}
          onPicked={handlePicked}
          onBack={() => setStep("fetch")}
        />
      )}
    </div>
  );
}