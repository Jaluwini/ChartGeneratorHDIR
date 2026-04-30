import { useState } from "react";
import { Download, Copy, Check, Code2, FileCode, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { configToHTML } from "@/lib/chartUtils";

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 h-7 text-xs">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

function DownloadButton({ content, filename, mimeType, label, icon: IconComp }) {
  const download = () => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button size="sm" variant="outline" onClick={download} className="gap-1.5 h-7 text-xs">
      <IconComp className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}

const TABS = [
  { id: "json", label: "JSON", icon: Code2 },
  { id: "html", label: "HTML", icon: FileCode },
];

export default function ExportPanel({ hcConfig, chartRef, apiSource }) {
  const [tab, setTab] = useState("json");

  if (!hcConfig) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">
        Configure a chart to see export options
      </div>
    );
  }

  const jsonStr = JSON.stringify(hcConfig, null, 2);
  const htmlStr = configToHTML(hcConfig, apiSource);

  const exportPNGCanvas = () => {
    const container = document.querySelector(".highcharts-container svg");
    if (!container) return;

    const svgData = new XMLSerializer().serializeToString(container);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const bbox = container.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const scale = 2; // retina quality
    canvas.width = (bbox.width || 800) * scale;
    canvas.height = (bbox.height || 400) * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    const img = new window.Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = "chart.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl mb-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center
              ${tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {tab === "json" && (
          <>
            <CopyButton text={jsonStr} label="Copy JSON" />
            <DownloadButton
              content={jsonStr}
              filename="chart-config.json"
              mimeType="application/json"
              label="Download JSON"
              icon={Download}
            />
          </>
        )}
        {tab === "html" && (
          <>
            <CopyButton text={htmlStr} label="Copy HTML" />
            <DownloadButton
              content={htmlStr}
              filename="chart.html"
              mimeType="text/html"
              label="Download HTML"
              icon={Download}
            />
          </>
        )}
        <Button size="sm" variant="outline" onClick={exportPNGCanvas} className="gap-1.5 h-7 text-xs ml-auto">
          <Image className="w-3.5 h-3.5" />
          Export PNG
        </Button>
      </div>

      {/* Code view */}
      <div className="flex-1 rounded-xl border border-border overflow-auto bg-[hsl(222,47%,8%)] dark:bg-[hsl(222,47%,6%)]">
        <pre className="code-block text-[hsl(210,40%,85%)] p-4 text-[0.72rem]">
          {tab === "json" ? jsonStr : htmlStr}
        </pre>
      </div>
    </div>
  );
}