import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { detectColumns, suggestChartConfig } from "@/lib/chartUtils";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowRight, Search } from "lucide-react";

const INDEX_URL = "https://api.helsedirektoratet.no/innhold/nki/kvalitetsindikatorer/";

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

function findBestArray(obj) {
  // Find the largest array-of-objects in the response
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") return obj;
  if (typeof obj === "object" && obj !== null) {
    let best = null;
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
        if (!best || val.length > best.length) best = val;
      }
    }
    if (best) return best;
  }
  return null;
}

export default function ApiDataImporter({ onDataLoaded }) {
  const [indicators, setIndicators] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Load the indicator index on mount
  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      setListError(null);
      try {
        const response = await base44.functions.invoke("fetchApiData", { url: INDEX_URL, headers: {} });
        const result = response.data;
        if (result.error) { setListError(result.error); setLoadingList(false); return; }
        const arr = Array.isArray(result.data) ? result.data : [];
        // Each item: { id, tittel, tekst, attachments: [{fileUri, fileType}] }
        const items = arr
          .filter(item => item.tittel && item.attachments?.some(a => a.fileType === "application/json"))
          .map(item => ({
            id: item.id,
            tittel: item.tittel,
            tekst: item.tekst || "",
            jsonUrl: item.attachments.find(a => a.fileType === "application/json").fileUri,
          }))
          .sort((a, b) => a.tittel.localeCompare(b.tittel, "no"));
        setIndicators(items);
      } catch (e) {
        setListError(e.message || "Kunne ikke laste indikatorer.");
      }
      setLoadingList(false);
    };
    load();
  }, []);

  const handleSelect = async (indicator) => {
    setSelected(indicator);
    setLoadingData(true);
    setDataError(null);
    try {
      const response = await base44.functions.invoke("fetchApiData", { url: indicator.jsonUrl, headers: {} });
      const result = response.data;
      if (result.error) { setDataError(result.error); setLoadingData(false); return; }
      const arr = findBestArray(result.data);
      if (!arr) { setDataError("Ingen tabelldata funnet for denne indikatoren."); setLoadingData(false); return; }
      const rows = arr.map(item => typeof item === "object" ? flattenObject(item) : { value: item });
      const cols = detectColumns(rows);
      onDataLoaded({ data: rows, columns: cols, source: "helsedirektoratet" });
    } catch (e) {
      setDataError(e.message || "Kunne ikke laste data.");
    }
    setLoadingData(false);
  };

  const filtered = indicators.filter(ind =>
    ind.tittel.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingList) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Laster indikatorer fra Helsedirektoratet…
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>{listError}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground mb-2">
          Velg en kvalitetsindikator fra Helsedirektoratet:
        </p>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søk etter indikator…"
            className="w-full pl-8 pr-3 h-8 rounded-lg border border-input bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
        </div>

        {/* List */}
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Ingen treff</p>
          )}
          {filtered.map(ind => (
            <button
              key={ind.id}
              onClick={() => handleSelect(ind)}
              disabled={loadingData}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                selected?.id === ind.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              } disabled:opacity-50`}
            >
              <p className="text-xs font-medium text-foreground leading-snug">{ind.tittel}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Loading / error state for selected indicator */}
      {loadingData && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Henter data for «{selected?.tittel}»…
        </div>
      )}
      {dataError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{dataError}</span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Kilde: <a href="https://www.helsedirektoratet.no" target="_blank" rel="noreferrer" className="underline underline-offset-2">Helsedirektoratet</a>
      </p>
    </div>
  );
}