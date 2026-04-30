import { useState } from "react";
import { CHART_TYPES, DEFAULT_COLORS } from "@/lib/chartUtils";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
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
      {open && <div className="p-3.5 space-y-3">{children}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="space-y-1">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background text-sm px-2.5 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-all"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <Input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
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

export default function ChartConfig({ config, onChange, columns }) {
  const numericCols = columns.filter(c => c.type === "number");
  const allColOptions = columns.map(c => ({ value: c.name, label: c.name }));

  const set = (key, val) => onChange({ ...config, [key]: val });

  const toggleYAxis = (col) => {
    const current = config.yAxes || [];
    const updated = current.includes(col)
      ? current.filter(c => c !== col)
      : [...current, col];
    set("yAxes", updated);
  };

  const updateColor = (i, val) => {
    const cols = [...(config.colors || DEFAULT_COLORS)];
    cols[i] = val;
    set("colors", cols);
  };

  const addColor = () => {
    const cols = [...(config.colors || DEFAULT_COLORS)];
    cols.push("#888888");
    set("colors", cols);
  };

  const removeColor = (i) => {
    const cols = [...(config.colors || DEFAULT_COLORS)];
    cols.splice(i, 1);
    set("colors", cols);
  };

  return (
    <div className="space-y-2.5">
      {/* Chart type */}
      <Section title="Chart Type">
        <div className="grid grid-cols-2 gap-1.5">
          {CHART_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => set("chartType", ct.value)}
              className={`text-xs px-2 py-2 rounded-lg font-medium transition-all border
                ${config.chartType === ct.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border bg-card hover:bg-muted text-foreground"
                }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Data mapping */}
      <Section title="Data Mapping">
        <SelectField
          label="X-Axis (Categories)"
          value={config.xAxis}
          onChange={v => set("xAxis", v)}
          options={allColOptions}
          placeholder="— Select column —"
        />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Y-Values (select one or more)</Label>
          <div className="space-y-1.5">
            {(config.yAxes || []).map((col, i) => (
              <div key={i} className="flex gap-1.5">
                <select
                  value={col}
                  onChange={e => {
                    const updated = [...(config.yAxes || [])];
                    updated[i] = e.target.value;
                    set("yAxes", updated);
                  }}
                  className="flex-1 rounded-lg border border-input bg-background text-sm px-2.5 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                >
                  {columns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}{c.type === "number" ? " #" : ""}</option>
                  ))}
                </select>
                <button
                  onClick={() => set("yAxes", (config.yAxes || []).filter((_, j) => j !== i))}
                  className="px-2 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const available = columns.find(c => !(config.yAxes || []).includes(c.name));
                if (available) set("yAxes", [...(config.yAxes || []), available.name]);
              }}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Y-value
            </button>
          </div>
          {columns.length === 0 && (
            <p className="text-xs text-muted-foreground">No columns detected</p>
          )}
        </div>
        {config.chartType !== "pie" && config.chartType !== "scatter" && (
          <SelectField
            label="Group by / Series (optional)"
            value={config.groupBy}
            onChange={v => set("groupBy", v)}
            options={[{ value: "none", label: "— None —" }, ...allColOptions]}
          />
        )}
      </Section>

      {/* Labels */}
      <Section title="Labels & Titles">
        <TextField label="Chart title" value={config.title} onChange={v => set("title", v)} placeholder="My Chart" />
        <TextField label="Subtitle" value={config.subtitle} onChange={v => set("subtitle", v)} placeholder="Optional subtitle" />
        <TextField label="X-axis title" value={config.xAxisTitle} onChange={v => set("xAxisTitle", v)} placeholder="Categories" />
        <TextField label="Y-axis title" value={config.yAxisTitle} onChange={v => set("yAxisTitle", v)} placeholder="Values" />
      </Section>

      {/* Display */}
      <Section title="Display Options">
        <SwitchField label="Data labels" value={config.dataLabels} onChange={v => set("dataLabels", v)} />
        <SwitchField label="Legend" value={config.legend !== false} onChange={v => set("legend", v)} />
        <SelectField
          label="Sort data"
          value={config.sortData || "none"}
          onChange={v => set("sortData", v)}
          options={[
            { value: "none", label: "No sorting" },
            { value: "asc", label: "Ascending" },
            { value: "desc", label: "Descending" },
          ]}
        />
        <TextField
          label="Decimals"
          value={config.decimals ?? ""}
          onChange={v => set("decimals", v === "" ? 0 : parseInt(v) || 0)}
          placeholder="0"
          type="number"
        />
        <TextField
          label="Tooltip format"
          value={config.tooltipFormat || ""}
          onChange={v => set("tooltipFormat", v)}
          placeholder="{y:.0f}"
        />
      </Section>

      {/* Size */}
      <Section title="Size" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Width (px)"
            value={config.width || ""}
            onChange={v => set("width", v ? parseInt(v) : null)}
            placeholder="Auto"
            type="number"
          />
          <TextField
            label="Height (px)"
            value={config.height || ""}
            onChange={v => set("height", v ? parseInt(v) : 400)}
            placeholder="400"
            type="number"
          />
        </div>
      </Section>

      {/* Colors */}
      <Section title="Colors" defaultOpen={false}>
        <div className="grid grid-cols-5 gap-2">
          {(config.colors || DEFAULT_COLORS).map((color, i) => (
            <div key={i} className="relative group">
              <input
                type="color"
                value={color}
                onChange={e => updateColor(i, e.target.value)}
                className="w-full h-8 rounded-md border border-border cursor-pointer"
                title={color}
              />
              <button
                onClick={() => removeColor(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground items-center justify-center text-[10px] hidden group-hover:flex"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addColor}
            className="h-8 rounded-md border border-dashed border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <button
          onClick={() => set("colors", DEFAULT_COLORS)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Reset to defaults
        </button>
      </Section>
    </div>
  );
}