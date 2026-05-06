import { useState } from "react";
import { Download, Copy, Check, FileJson, FileCode2, Globe, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

function buildHtml(data, columns, config) {
  const visibleCols = config.visibleColumns
    ? columns.filter(c => config.visibleColumns.includes(c.name))
    : columns;
  const aliases = config.columnAliases || {};

  const hBg = config.headerBg || "#f4f4f5";
  const hText = config.headerText || "#111827";
  const stripedColor = config.stripedColor || "#f9fafb";
  const borderColor = config.borderColor || "#e5e7eb";
  const tableBg = config.tableBg || "#ffffff";
  const pad = config.compact ? "6px 12px" : "10px 16px";
  const fontSize = config.fontSize === "xs" ? "12px" : config.fontSize === "base" ? "16px" : "14px";
  const textAlign = config.textAlign || "left";

  const headerRow = visibleCols.map(c =>
    `<th style="padding:${pad};text-align:${textAlign};font-weight:600;background:${hBg};color:${hText};border-bottom:2px solid ${borderColor};white-space:nowrap">${aliases[c.name] ?? c.name}</th>`
  ).join("");

  const bodyRows = data.map((row, i) => {
    const bg = config.striped !== false && i % 2 === 1 ? stripedColor : tableBg;
    const cells = visibleCols.map(c =>
      `<td style="padding:${pad};text-align:${textAlign};border-bottom:1px solid ${borderColor};background:${bg}">${String(row[c.name] ?? "")}</td>`
    ).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<title>${config.title || "Tabell"}</title>
<style>
  body { font-family: Inter, sans-serif; padding: 24px; font-size: ${fontSize}; background: ${tableBg}; }
  table { border-collapse: collapse; width: 100%; }
  tr:hover td { background: ${config.hoverColor || "#f3f4f6"} !important; }
</style>
</head>
<body>
${config.title ? `<h2 style="margin-bottom:4px;color:${hText}">${config.title}</h2>` : ""}
${config.subtitle ? `<p style="color:#6b7280;font-size:${fontSize};margin-bottom:16px">${config.subtitle}</p>` : ""}
<table>
<thead><tr>${headerRow}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
${config.sourceText ? `<p style="margin-top:12px;font-size:12px;color:#9ca3af;font-style:italic">Kilde: ${config.sourceText}</p>` : ""}
</body>
</html>`;
}

function buildJsonOutput(data, columns, config) {
  const visibleCols = config.visibleColumns
    ? columns.filter(c => config.visibleColumns.includes(c.name))
    : columns;
  const aliases = config.columnAliases || {};

  const rows = data.map(row => {
    const obj = {};
    visibleCols.forEach(col => {
      const key = aliases[col.name] ?? col.name;
      obj[key] = row[col.name] ?? null;
    });
    return obj;
  });

  return {
    meta: {
      title: config.title || "",
      subtitle: config.subtitle || "",
      source: config.sourceText || "",
      columns: visibleCols.map(c => ({ key: aliases[c.name] ?? c.name, type: c.type })),
      total_rows: rows.length,
    },
    data: rows,
  };
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Kopiert!" : label}
    </button>
  );
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function TableExportPanel({ data, columns, config, savedChartId }) {
  const [activeTab, setActiveTab] = useState("json");

  const downloadTableHTML = async () => {
    if (!savedChartId) return;
    try {
      const res = await base44.functions.invoke('renderTable', { id: savedChartId, format: 'download' });
      const html = res.data;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.title || 'tabell'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Feil ved nedlasting: ' + err.message);
    }
  };

  if (!data) return <div className="p-6 text-sm text-muted-foreground">Last opp data for å se eksportalternativer.</div>;

  const jsonOutput = buildJsonOutput(data, columns, config);
  const jsonStr = JSON.stringify(jsonOutput, null, 2);
  const htmlOutput = buildHtml(data, columns, config);

  const TABS = [
    { id: "json", label: "JSON", icon: FileJson },
    { id: "html", label: "HTML", icon: FileCode2 },
    { id: "embed", label: "Embed", icon: LinkIcon },
    { id: "api", label: "API", icon: Globe },
  ];

  const apiUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/functions/getChart?id=${savedChartId || "<id>"}`
    : "";

  return (
    <div className="flex flex-col gap-3 h-full p-4">
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "json" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 justify-between">
            <span className="text-xs text-muted-foreground">JSON med metadata og alle rader</span>
            <div className="flex gap-2">
              <CopyButton text={jsonStr} label="Kopier" />
              <button
                onClick={() => downloadFile(jsonStr, `${config.title || "tabell"}.json`, "application/json")}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Download className="w-3.5 h-3.5" />Last ned
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto rounded-xl bg-muted/50 p-4 text-[11px] font-mono text-foreground/80 whitespace-pre-wrap min-h-[300px]">
            {jsonStr}
          </pre>
        </div>
      )}

      {activeTab === "html" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 justify-between">
            <span className="text-xs text-muted-foreground">Ferdig stilsatt HTML-tabell</span>
            <div className="flex gap-2">
              <CopyButton text={htmlOutput} label="Kopier" />
              <button
                onClick={() => downloadFile(htmlOutput, `${config.title || "tabell"}.html`, "text/html")}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Download className="w-3.5 h-3.5" />Last ned
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto rounded-xl bg-muted/50 p-4 text-[11px] font-mono text-foreground/80 whitespace-pre-wrap min-h-[300px]">
            {htmlOutput}
          </pre>
        </div>
      )}

      {activeTab === "embed" && (
        <div className="flex flex-col gap-4">
          {!savedChartId ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Lagre tabellen først for å få en embed-URL.
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Bruk en av disse metodene for å embedde tabellen i ditt CMS.
              </p>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground block mb-1.5">1. Last ned HTML-fil</span>
                  <button
                    onClick={() => downloadTableHTML()}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />Last ned HTML
                  </button>
                  <p className="text-[11px] text-muted-foreground mt-1.5">Laster ned en selvstendig HTML-fil med all styling og funksjonalitet. Kopier innholdet direkte inn i CMS-et ditt.</p>
                </div>

                <div className="border-t border-border pt-3">
                  <span className="text-xs font-medium text-muted-foreground block mb-1.5">2. Hent HTML via API</span>
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Kall denne URL-en for å få den genererte HTML-en.</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] bg-muted/50 rounded-lg px-3 py-2 font-mono text-foreground/80 overflow-auto break-all">
                        {`${window.location.origin}/api/functions/renderTable?id=${savedChartId}`}
                      </code>
                      <CopyButton text={`${window.location.origin}/api/functions/renderTable?id=${savedChartId}`} label="Kopier" />
                    </div>
                  </div>
                  <pre className="text-[11px] bg-muted/50 rounded-lg px-3 py-2.5 font-mono text-foreground/80 overflow-auto mt-2">{`const res = await fetch("${window.location.origin}/api/functions/renderTable?id=${savedChartId}");
const { html } = await res.json();
// html inneholder komplett HTML med styling og JavaScript`}</pre>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "api" && (
        <div className="flex flex-col gap-4">
          {!savedChartId ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Lagre tabellen først for å få en API-URL.
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Gå til <strong>Mine grafer</strong>, aktiver <strong>«Eksponer i API»</strong> for denne tabellen, og bruk URL-en nedenfor.
              </p>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">API-endepunkt</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] bg-muted/50 rounded-lg px-3 py-2 font-mono text-foreground/80 overflow-auto">
                    {apiUrl}
                  </code>
                  <CopyButton text={apiUrl} label="Kopier" />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Fetch-eksempel (JavaScript)</span>
                <pre className="text-[11px] bg-muted/50 rounded-lg px-3 py-2.5 font-mono text-foreground/80 overflow-auto">{`const res = await fetch("${apiUrl}");
const json = await res.json();
// json.data = array of rows
// json.meta = { title, columns, total_rows, ... }`}</pre>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">cURL</span>
                <pre className="text-[11px] bg-muted/50 rounded-lg px-3 py-2.5 font-mono text-foreground/80 overflow-auto">{`curl "${apiUrl}"`}</pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}