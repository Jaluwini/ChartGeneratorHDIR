import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { detectColumns } from "@/lib/chartUtils";
import { Loader2, AlertCircle, Search, Maximize2, X } from "lucide-react";

function FullscreenModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <span className="font-semibold text-sm text-foreground">{title}</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  );
}

export default function ApiDataImporter({ onDataLoaded, onIndicatorSelected }) {
  const [indicators, setIndicators] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const [selected, setSelected] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [selectedMeasureType, setSelectedMeasureType] = useState(null);
  const [selectedEnhetType, setSelectedEnhetType] = useState(null);

  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      setListError(null);
      try {
        const res = await base44.functions.invoke("helsedirData", { action: "list" });
        setIndicators(res.data?.indicators || []);
      } catch (e) {
        setListError(e.message || "Kunne ikke laste indikatorer.");
      }
      setLoadingList(false);
    };
    load();
  }, []);

  const fetchData = async (indicator, measureType, enhetType) => {
    setLoadingData(true);
    setDataError(null);
    try {
      const payload = { action: "fetchData", jsonUrl: indicator.jsonUrl };
      if (measureType) payload.measureType = measureType;
      if (enhetType) payload.enhetType = enhetType;

      const res = await base44.functions.invoke("helsedirData", payload);
      const { rows, filterOptions: opts, selectedFilters } = res.data;

      if (!rows || rows.length === 0) {
        setDataError("Ingen data funnet med valgte filtre.");
        setLoadingData(false);
        return;
      }

      if (opts) {
        setFilterOptions(opts);
        if (!measureType) setSelectedMeasureType(selectedFilters.measureType);
        if (!enhetType) setSelectedEnhetType(selectedFilters.enhetType);
      }

      const cols = detectColumns(rows);
      onDataLoaded({
        data: rows,
        columns: cols,
        source: "helsedirektoratet",
        title: indicator.tittel,
        savedJsonUrl: indicator.jsonUrl,
        savedMeasureType: selectedFilters.measureType,
        savedEnhetType: selectedFilters.enhetType,
      });
    } catch (e) {
      setDataError(e.message || "Kunne ikke laste data.");
    }
    setLoadingData(false);
  };

  const handleSelect = (indicator) => {
    setSelected(indicator);
    setFilterOptions(null);
    setSelectedMeasureType(null);
    setSelectedEnhetType(null);
    fetchData(indicator, null, null);
    if (onIndicatorSelected) onIndicatorSelected(indicator);
    setFullscreen(false);
  };

  const handleFilterChange = (measureType, enhetType) => {
    if (!selected) return;
    fetchData(selected, measureType, enhetType);
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

  const IndicatorList = ({ maxH = "max-h-52" }) => (
    <div className={`space-y-1 ${maxH} overflow-y-auto pr-1`}>
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
  );

  return (
    <div className="space-y-3">
      {fullscreen && (
        <FullscreenModal title="Velg indikator — Helsedirektoratet" onClose={() => setFullscreen(false)}>
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Søk etter indikator…"
                className="w-full pl-8 pr-3 h-9 rounded-lg border border-input bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-all"
              />
            </div>
            <p className="text-xs text-muted-foreground">{filtered.length} indikatorer</p>
            <IndicatorList maxH="max-h-[calc(100vh-220px)]" />
          </div>
        </FullscreenModal>
      )}

      {selected && !loadingData ? (
        /* Compact selected state */
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Valgt indikator</p>
            <p className="text-xs font-medium text-foreground leading-snug">{selected.tittel}</p>
          </div>
          <button
            onClick={() => setFullscreen(true)}
            className="text-[11px] text-primary hover:text-primary/80 underline underline-offset-2 whitespace-nowrap flex-shrink-0 mt-0.5"
          >
            Bytt
          </button>
        </div>
      ) : !selected ? (
        /* Picker: search + list */
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Velg en kvalitetsindikator fra Helsedirektoratet:</p>
            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title="Fullskjerm"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søk etter indikator…"
              className="w-full pl-8 pr-3 h-8 rounded-lg border border-input bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-all"
            />
          </div>
          <IndicatorList />
        </>
      ) : null}

      {/* Filter options */}
      {filterOptions && !loadingData && (
        <div className="space-y-2 pt-1 border-t border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Filtrer data</p>

          {filterOptions.enhetTypes.length > 1 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nivå</label>
              <div className="flex flex-wrap gap-1.5">
                {filterOptions.enhetTypes.map(et => (
                  <button
                    key={et}
                    onClick={() => {
                      setSelectedEnhetType(et);
                      handleFilterChange(selectedMeasureType, et);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      selectedEnhetType === et
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {et}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterOptions.measureTypes.length > 1 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Måletype</label>
              <div className="flex flex-wrap gap-1.5">
                {filterOptions.measureTypes.map(mt => (
                  <button
                    key={mt}
                    onClick={() => {
                      setSelectedMeasureType(mt);
                      handleFilterChange(mt, selectedEnhetType);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      selectedMeasureType === mt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {mt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loadingData && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          {selected ? `Henter data for «${selected.tittel}»…` : "Henter data…"}
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