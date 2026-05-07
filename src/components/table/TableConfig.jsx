import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Trash2 as Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="p-3.5 space-y-2.5">{children}</div>}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs text-foreground">{label}</span>
      <div
        onClick={() => onChange(!value)}
        className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}

function ColorInput({ label, value, onChange, defaultVal }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="flex gap-1.5 items-center">
        <input
          type="color"
          value={value || defaultVal}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-md border border-border cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value || defaultVal}
          onChange={e => onChange(e.target.value)}
          className="flex-1 text-xs px-2 py-1.5 rounded-md border border-input bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}

export default function TableConfig({ config, onChange, columns }) {
  const set = (k, v) => onChange({ ...config, [k]: v });

  const visibleColumns = config.visibleColumns ?? columns.map(c => c.name);
  const visibleSet = new Set(visibleColumns);

  const toggleColumn = (name) => {
    const next = visibleSet.has(name)
      ? visibleColumns.filter(n => n !== name)
      : [...visibleColumns, name];
    set("visibleColumns", next.length === columns.length ? null : next);
  };

  const moveColumn = (name, dir) => {
    const cols = [...visibleColumns];
    const idx = cols.indexOf(name);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cols.length) return;
    [cols[idx], cols[newIdx]] = [cols[newIdx], cols[idx]];
    set("visibleColumns", cols);
  };

  const columnAliases = config.columnAliases || {};

  return (
    <div className="space-y-2.5">
      {/* Titler */}
      <Section title="Titler">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tittel <span className="text-destructive">*</span></Label>
          <Input
            value={config.title || ""}
            onChange={e => set("title", e.target.value)}
            placeholder="Tabellens tittel"
            className={`h-8 text-sm ${!config.title ? "border-destructive" : ""}`}
          />
          {!config.title && <p className="text-[11px] text-destructive">Tittel er obligatorisk</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Undertittel</Label>
          <Input value={config.subtitle || ""} onChange={e => set("subtitle", e.target.value)} placeholder="Valgfri undertittel" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Kildetekst</Label>
          <Input value={config.sourceText || ""} onChange={e => set("sourceText", e.target.value)} placeholder="f.eks. Helsedirektoratet 2024" className="h-8 text-sm" />
        </div>
      </Section>

      {/* Kolonner */}
      <Section title="Kolonner og rekkefølge">
        <p className="text-[11px] text-muted-foreground">Huk av for å vise, dra for å endre rekkefølge.</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {visibleColumns.map((name) => {
            const col = columns.find(c => c.name === name);
            if (!col) return null;
            return (
              <div key={name} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 group">
                <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
                <input type="checkbox" checked={visibleSet.has(name)} onChange={() => toggleColumn(name)} className="accent-primary" />
                <input
                  type="text"
                  value={columnAliases[name] ?? name}
                  onChange={e => set("columnAliases", { ...columnAliases, [name]: e.target.value })}
                  className="flex-1 text-xs px-1.5 py-0.5 rounded border border-transparent hover:border-border focus:border-border bg-transparent focus:bg-background outline-none"
                  title="Klikk for å endre kolonneoverskrift"
                />
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveColumn(name, -1)} className="p-0.5 hover:bg-muted rounded"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveColumn(name, 1)} className="p-0.5 hover:bg-muted rounded"><ChevronDown className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
          {columns.filter(c => !visibleSet.has(c.name)).map(col => (
            <div key={col.name} className="flex items-center gap-2 p-1.5 rounded-lg opacity-50">
              <GripVertical className="w-3 h-3 text-muted-foreground/40" />
              <input type="checkbox" checked={false} onChange={() => toggleColumn(col.name)} className="accent-primary" />
              <span className="flex-1 text-xs text-muted-foreground">{col.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Visning */}
      <Section title="Layout og visning">
       <Toggle label="Stripete rader" value={config.striped !== false} onChange={v => set("striped", v)} />
       <Toggle label="Kompakt visning" value={!!config.compact} onChange={v => set("compact", v)} />
       <Toggle label="Frys header ved scroll" value={config.stickyHeader !== false} onChange={v => set("stickyHeader", v)} />
       <Toggle label="Søkefelt" value={config.showSearch !== false} onChange={v => set("showSearch", v)} />
       <Toggle label="Sortering ved klikk" value={config.sortable !== false} onChange={v => set("sortable", v)} />
       <Toggle label="Vis radnummer" value={!!config.showRowNumbers} onChange={v => set("showRowNumbers", v)} />
       <Toggle label="Uthev tallkolonner" value={!!config.highlightNumbers} onChange={v => set("highlightNumbers", v)} />
       <Toggle label="Ikke bryt tekst" value={!!config.nowrap} onChange={v => set("nowrap", v)} />

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tekstjustering</Label>
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
            {["left", "center", "right"].map(a => (
              <button key={a} onClick={() => set("textAlign", a)}
                className={`flex-1 py-1.5 transition-colors ${config.textAlign === a ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {a === "left" ? "Venstre" : a === "center" ? "Midtstilt" : "Høyre"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Skriftstørrelse</Label>
          <select value={config.fontSize || "sm"} onChange={e => set("fontSize", e.target.value)}
            className="w-full rounded-lg border border-input bg-background text-sm px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring">
            <option value="xs">Liten (xs)</option>
            <option value="sm">Normal (sm)</option>
            <option value="base">Stor (base)</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Maks rader per side (paginering)</Label>
          <select value={config.pageSize || 0} onChange={e => set("pageSize", parseInt(e.target.value))}
            className="w-full rounded-lg border border-input bg-background text-sm px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring">
            <option value={0}>Ingen paginering</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </Section>

      {/* Farger */}
      <Section title="Farger" defaultOpen={false}>
        <ColorInput label="Bakgrunn header" value={config.headerBg} onChange={v => set("headerBg", v)} defaultVal="#f4f4f5" />
        <ColorInput label="Tekstfarge header" value={config.headerText} onChange={v => set("headerText", v)} defaultVal="#111827" />
        <ColorInput label="Stripete radfarge" value={config.stripedColor} onChange={v => set("stripedColor", v)} defaultVal="#f9fafb" />
        <ColorInput label="Hover-farge rader" value={config.hoverColor} onChange={v => set("hoverColor", v)} defaultVal="#f3f4f6" />
        <ColorInput label="Kantlinjefarge" value={config.borderColor} onChange={v => set("borderColor", v)} defaultVal="#e5e7eb" />
        <ColorInput label="Tabellbakgrunn" value={config.tableBg} onChange={v => set("tableBg", v)} defaultVal="#ffffff" />
        <ColorInput label="Tallfarge (uthevet)" value={config.numberColor} onChange={v => set("numberColor", v)} defaultVal="#2563eb" />
      </Section>

      {/* Fotnoter og kilder */}
      <Section title="Fotnoter og kilder" defaultOpen={false}>
        <p className="text-[11px] text-muted-foreground mb-2">
          Legg til fotnoter og knytt dem til ord i tabellen via nøkkelord. Celler som inneholder nøkkelordet vil få en ¹ ² ³ referanse.
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {(config.footnotes || []).map((fn, idx) => {
            const note = typeof fn === "string" ? { text: fn, keyword: "" } : fn;
            const updateNote = (field, val) => {
              const newNotes = (config.footnotes || []).map((n, i) => {
                if (i !== idx) return n;
                const current = typeof n === "string" ? { text: n, keyword: "" } : { ...n };
                return { ...current, [field]: val };
              });
              set("footnotes", newNotes);
            };
            return (
              <div key={idx} className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/30 group border border-transparent hover:border-border transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={note.text}
                    onChange={e => updateNote("text", e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded border border-transparent hover:border-border focus:border-ring bg-transparent focus:bg-background outline-none"
                    placeholder="Fotnote-tekst…"
                  />
                  <button
                    onClick={() => set("footnotes", (config.footnotes || []).filter((_, i) => i !== idx))}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all text-destructive flex-shrink-0"
                  >
                    <Trash2Icon className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">Nøkkelord:</span>
                  <input
                    type="text"
                    value={note.keyword || ""}
                    onChange={e => updateNote("keyword", e.target.value)}
                    className="flex-1 text-[11px] px-2 py-0.5 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-ring font-mono"
                    placeholder="f.eks. Fastleger"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => set("footnotes", [...(config.footnotes || []), { text: "", keyword: "" }])}
          className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg border border-primary/30 transition-colors"
        >
          + Legg til fotnote
        </button>
      </Section>

      {/* Betinget formatering */}
      <Section title="Betinget formatering" defaultOpen={false}>
        <p className="text-[11px] text-muted-foreground">Marker celler i tallkolonner basert på verdi.</p>
        <Toggle label="Aktiver betinget formatering" value={!!config.conditionalFormat} onChange={v => set("conditionalFormat", v)} />
        {config.conditionalFormat && (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Kolonne</Label>
              <select value={config.cfColumn || ""} onChange={e => set("cfColumn", e.target.value)}
                className="w-full rounded-lg border border-input bg-background text-sm px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-ring">
                <option value="">— Velg kolonne —</option>
                {columns.filter(c => c.type === "number").map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Grense høy (≥)</Label>
                <Input type="number" value={config.cfHigh ?? ""} onChange={e => set("cfHigh", parseFloat(e.target.value))} placeholder="f.eks. 80" className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Grense lav (≤)</Label>
                <Input type="number" value={config.cfLow ?? ""} onChange={e => set("cfLow", parseFloat(e.target.value))} placeholder="f.eks. 20" className="h-7 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ColorInput label="Høy farge" value={config.cfHighColor} onChange={v => set("cfHighColor", v)} defaultVal="#dcfce7" />
              <ColorInput label="Middels" value={config.cfMidColor} onChange={v => set("cfMidColor", v)} defaultVal="#fef9c3" />
              <ColorInput label="Lav farge" value={config.cfLowColor} onChange={v => set("cfLowColor", v)} defaultVal="#fee2e2" />
            </div>
          </>
        )}
      </Section>
    </div>
  );
}