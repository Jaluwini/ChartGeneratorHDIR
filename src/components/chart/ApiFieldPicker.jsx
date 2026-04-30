import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Link, Link2Off } from "lucide-react";

/**
 * A hybrid input: shows a text field the user can type in,
 * with a dropdown of API-sourced suggestions.
 */
function HybridInput({ label, value, onChange, suggestions, placeholder }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "Skriv eller velg fra API…"}
          className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-all pr-8"
          onFocus={() => suggestions?.length && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
        {suggestions?.length > 0 && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setShowSuggestions(v => !v); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
        {showSuggestions && suggestions?.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => { onChange(s); setShowSuggestions(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors truncate"
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Fetches metadata from a helsedirektoratet indicator JSON file
 * and exposes key fields as suggestions for chart config fields.
 */
export default function ApiFieldPicker({ jsonUrl, config, onChange }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jsonUrl) return;
    setLoading(true);
    base44.functions.invoke("helsedirData", { action: "fetchMeta", jsonUrl })
      .then(res => setMeta(res.data?.meta || null))
      .finally(() => setLoading(false));
  }, [jsonUrl]);

  const titleLocked = !!config.titleFromApi;

  // When locked, always keep config.title in sync with meta.title
  useEffect(() => {
    if (titleLocked && meta?.title) {
      onChange({ ...config, title: meta.title });
    }
  }, [meta?.title, titleLocked]);

  if (!jsonUrl) return null;

  const set = (key, val) => onChange({ ...config, [key]: val });

  const toggleTitleLock = () => {
    const nowLocked = !titleLocked;
    onChange({ ...config, titleFromApi: nowLocked, title: nowLocked && meta?.title ? meta.title : config.title });
  };

  // Build suggestion lists from meta
  const titleSuggestions = [meta?.title, ...(meta?.measureTypes || [])].filter(Boolean);
  const subtitleSuggestions = [meta?.description, meta?.timeRange, meta?.measureUnit].filter(Boolean);
  const yAxisSuggestions = [meta?.measureUnit, ...(meta?.measureTypes || [])].filter(Boolean);
  const xAxisSuggestions = ["År", "Enhet", "Overordnet"].filter(Boolean);

  return (
    <div className="space-y-2.5 pt-1 border-t border-border mt-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tekster fra API</p>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>

      {meta && (
        <div className="space-y-2">
          {/* Title with lock-to-API toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Tittel</label>
              <button
                type="button"
                onClick={toggleTitleLock}
                title={titleLocked ? "Koble fra API — skriv manuelt" : "Lås til API-tittel (oppdateres automatisk)"}
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                  titleLocked
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                    : "text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {titleLocked ? <Link className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                {titleLocked ? "Låst til API" : "Lås til API"}
              </button>
            </div>
            {titleLocked ? (
              <div className="w-full h-8 px-2.5 rounded-lg border border-primary/40 bg-primary/5 text-xs text-foreground flex items-center gap-1.5 truncate">
                <Link className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="truncate">{config.title || "…"}</span>
              </div>
            ) : (
              <HybridInput
                value={config.title}
                onChange={v => set("title", v)}
                suggestions={titleSuggestions}
                placeholder="Hent fra API eller skriv selv…"
              />
            )}
          </div>
          <HybridInput
            label="Undertittel"
            value={config.subtitle}
            onChange={v => set("subtitle", v)}
            suggestions={subtitleSuggestions}
            placeholder="Periode, beskrivelse…"
          />
          <HybridInput
            label="X-aksetittel"
            value={config.xAxisTitle}
            onChange={v => set("xAxisTitle", v)}
            suggestions={xAxisSuggestions}
            placeholder="f.eks. År"
          />
          <HybridInput
            label="Y-aksetittel"
            value={config.yAxisTitle}
            onChange={v => set("yAxisTitle", v)}
            suggestions={yAxisSuggestions}
            placeholder="f.eks. Andel (%)"
          />
        </div>
      )}

      {!loading && !meta && (
        <p className="text-xs text-muted-foreground">Laster metadata…</p>
      )}
    </div>
  );
}