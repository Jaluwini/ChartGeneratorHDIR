import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

function ColSelect({ label, value, onChange, columns, optional }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        {label} {optional && <span className="text-[10px] text-muted-foreground/60">(valgfri)</span>}
      </Label>
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background text-sm px-2.5 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-all"
      >
        <option value="">— Ikke valgt —</option>
        {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );
}

function SwitchField({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Switch checked={!!value} onCheckedChange={onChange} className="scale-75 origin-right" />
    </div>
  );
}

export default function BarometerConfig({ config, onChange, columns }) {
  const set = (key, val) => onChange({ ...config, [key]: val });

  return (
    <div className="space-y-2.5">
      {/* Titler */}
      <Section title="Titler">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            Graftittel <span className="text-destructive">*</span>
          </Label>
          <Input
            value={config.title || ""}
            onChange={e => set("title", e.target.value)}
            placeholder="Folkehelsebarometer 2024"
            className={`h-8 text-sm ${!config.title ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
          />
          {!config.title && <p className="text-[11px] text-destructive">Tittel er obligatorisk</p>}
        </div>
        <TextField label="Undertittel" value={config.subtitle} onChange={v => set("subtitle", v)} placeholder="Valgfri undertittel" />
      </Section>

      {/* Kolonnemapping */}
      <Section title="Kolonner">
        <ColSelect label="Indikator (y-akse)" value={config.colIndicator} onChange={v => set("colIndicator", v)} columns={columns} />
        <ColSelect label="Verdi (diamanten)" value={config.colValue} onChange={v => set("colValue", v)} columns={columns} />
        <ColSelect label="Referanse / Nasjonal verdi" value={config.colReference} onChange={v => set("colReference", v)} columns={columns} optional />
        <ColSelect label="Min (venstre av grå bar)" value={config.colMin} onChange={v => set("colMin", v)} columns={columns} optional />
        <ColSelect label="Maks (høyre av grå bar)" value={config.colMax} onChange={v => set("colMax", v)} columns={columns} optional />
        <ColSelect label="Enhet" value={config.colUnit} onChange={v => set("colUnit", v)} columns={columns} optional />
        <ColSelect label="Periode" value={config.colPeriod} onChange={v => set("colPeriod", v)} columns={columns} optional />
        <ColSelect label="Tema (gruppering)" value={config.colTheme} onChange={v => set("colTheme", v)} columns={columns} optional />
      </Section>

      {/* Fargelogikk */}
      <Section title="Fargelogikk">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Fargemetode</Label>
          <select
            value={config.colorMode || "relative"}
            onChange={e => set("colorMode", e.target.value)}
            className="w-full rounded-lg border border-input bg-background text-sm px-2.5 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring/50"
          >
            <option value="relative">Relativ % fra referanse</option>
            <option value="absolute">Absolutt avvik fra referanse</option>
            <option value="column">Fra kolonne (rød/gul/grønn)</option>
          </select>
        </div>

        {config.colorMode === "column" && (
          <ColSelect label="Fargekolonne" value={config.colColor} onChange={v => set("colColor", v)} columns={columns} />
        )}

        {config.colorMode !== "column" && (
          <>
            <SwitchField label="Høyere er bedre" value={config.higherIsBetter !== false} onChange={v => set("higherIsBetter", v)} />
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label={config.colorMode === "absolute" ? "Grense grønn (abs.)" : "Grense grønn (%)"}
                value={config.thresholdGood ?? 5}
                onChange={v => set("thresholdGood", parseFloat(v) || 0)}
                placeholder="5"
                type="number"
              />
              <TextField
                label={config.colorMode === "absolute" ? "Grense rød (abs.)" : "Grense rød (%)"}
                value={config.thresholdBad ?? -5}
                onChange={v => set("thresholdBad", parseFloat(v) || 0)}
                placeholder="-5"
                type="number"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Grønn", key: "colorGood", default: "#22c55e" },
            { label: "Gul", key: "colorNeutral", default: "#f59e0b" },
            { label: "Rød", key: "colorBad", default: "#ef4444" },
            { label: "Hvit", key: "colorMissing", default: "#ffffff" },
          ].map(({ label, key, default: def }) => (
            <div key={key} className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{label}</Label>
              <input
                type="color"
                value={config[key] || def}
                onChange={e => set(key, e.target.value)}
                className="w-full h-8 rounded-md border border-border cursor-pointer"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Visning */}
      <Section title="Visning" defaultOpen={false}>
        <SwitchField label="Vis grå variasjonsbar" value={config.showReferenceBar !== false} onChange={v => set("showReferenceBar", v)} />
        <TextField label="Fast referanselinje (x-verdi)" value={config.referenceLineFixed ?? ""} onChange={v => set("referenceLineFixed", v === "" ? null : parseFloat(v))} placeholder="Tom = bruker referansekolonne" type="number" />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Diamantstørrelse" value={config.diamondSize ?? 8} onChange={v => set("diamondSize", parseInt(v) || 8)} placeholder="8" type="number" />
          <TextField label="Desimaler" value={config.decimals ?? 1} onChange={v => set("decimals", parseInt(v) || 0)} placeholder="1" type="number" />
        </div>
        <TextField label="Enhetssuffiks" value={config.valueSuffix || ""} onChange={v => set("valueSuffix", v)} placeholder="f.eks. %, kr, per 1000" />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Barfarge</Label>
            <input type="color" value={config.barColor || "#cccccc"} onChange={e => set("barColor", e.target.value)} className="w-full h-8 rounded-md border border-border cursor-pointer" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Referanselinjefarge</Label>
            <input type="color" value={config.referenceLineColor || "#cc0000"} onChange={e => set("referenceLineColor", e.target.value)} className="w-full h-8 rounded-md border border-border cursor-pointer" />
          </div>
        </div>
        <TextField label="Høyde (px, auto hvis tom)" value={config.height ?? ""} onChange={v => set("height", v ? parseInt(v) : null)} placeholder="Auto" type="number" />
      </Section>
    </div>
  );
}