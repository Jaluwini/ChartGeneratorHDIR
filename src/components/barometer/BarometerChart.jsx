import { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsMore from "highcharts/highcharts-more";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsOfflineExporting from "highcharts/modules/offline-exporting";
import { AlertCircle } from "lucide-react";

HighchartsMore(Highcharts);
HighchartsExporting(Highcharts);
HighchartsOfflineExporting(Highcharts);

// Truncate text to fit within a pixel budget (each char ~7px at fontSize 8px rotated)
function truncateToFit(text, availablePx, charWidthPx = 7) {
  const maxChars = Math.floor(availablePx / charWidthPx);
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return "";
  return text.slice(0, maxChars - 1) + "…";
}

function drawThemeLabels(chart, themeSegments, rowCount) {
  if (!themeSegments || themeSegments.length === 0) return;

  // Remove previously drawn theme labels
  if (chart._themeLabels) {
    chart._themeLabels.forEach(el => el.destroy());
  }
  chart._themeLabels = [];

  const xAxis = chart.xAxis[0];
  const plotRight = chart.plotLeft + chart.plotWidth;
  const rowHeightPx = chart.plotHeight / rowCount;

  themeSegments.forEach((seg) => {
    const segRowCount = seg.to - seg.from; // in axis units
    const segHeightPx = segRowCount * rowHeightPx;

    // Pixel center of segment on the screen (chart is inverted, so xAxis is vertical)
    const topPx = xAxis.toPixels(seg.from, false);
    const bottomPx = xAxis.toPixels(seg.to, false);
    const centerY = (topPx + bottomPx) / 2;

    // Available height for text (leave 8px padding each side)
    const availablePx = Math.abs(bottomPx - topPx) - 16;
    const label = truncateToFit(seg.theme.toUpperCase(), availablePx);
    if (!label) return;

    const x = plotRight + 10; // 10px right of plot area

    const el = chart.renderer.text(label, x, centerY)
      .attr({
        rotation: 90,
        align: "center",
        zIndex: 5,
        title: seg.theme, // native SVG tooltip on hover
      })
      .css({
        fontSize: "8px",
        fontWeight: "700",
        color: "#9ca3af",
        letterSpacing: "0.1em",
        fontFamily: "Inter, sans-serif",
        cursor: "default",
      })
      .add();

    chart._themeLabels.push(el);
  });
}

export default function BarometerChart({ hcConfig }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!hcConfig) {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      setError(null);
      return;
    }

    setError(null);
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const themeSegments = hcConfig._themeSegments || [];
    const rowCount = hcConfig._rowCount || 1;

    // Strip custom metadata before passing to Highcharts
    const { _themeSegments, _rowCount, ...cleanConfig } = hcConfig;

    try {
      const chart = Highcharts.chart(containerRef.current, {
        ...cleanConfig,
        chart: {
          ...cleanConfig.chart,
          animation: { duration: 300 },
          style: { fontFamily: "Inter, sans-serif" },
          events: {
            render() {
              drawThemeLabels(this, themeSegments, rowCount);
            },
          },
        },
        exporting: {
          enabled: true,
          buttons: {
            contextButton: {
              menuItems: ["downloadPNG", "downloadJPEG", "downloadSVG", "downloadPDF"]
            }
          }
        }
      });
      chartRef.current = chart;
    } catch (e) {
      setError(e.message);
    }
  }, [hcConfig]);

  useEffect(() => {
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, []);

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 text-destructive text-sm m-4">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto animate-fade-in p-4">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}