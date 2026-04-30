import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { detectColumns } from "@/lib/chartUtils";
import { Loader2, AlertCircle, Search, ChevronDown } from "lucide-react";

export default function ApiDataImporter({ onDataLoaded, onIndicatorSelected }) {
  const [indicators, setIndicators] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null); // { measureTypes, enhetTypes }
  const [selectedMeasureType, setSelectedMeasureType] = useState(null);
  const [selectedEnhetType, setSelectedEnhetType] = useState(null);

  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Load indicator list on mount
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

  // Fetch data whenever selected indicator or filters change
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

      // Set filter options the first time
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

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Velg en kvalitetsindikator fra Helsedirektoratet:
      </p>

      {/* Search */}
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

      {/* Indicator list */}
      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
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

      {/* Filter options — shown after indicator is selected */}
      {filterOptions && !loadingData && (
        <div className="space-y-2 pt-1 border-t border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Filtrer data</p>

          {/* Enhet type */}
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

          {/* Measure type */}
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

      {/* Loading state */}
      {loadingData && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          {selected ? `Henter data for «${selected.tittel}»…` : "Henter data…"}
        </div>
      )}

      {/* Error state */}
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