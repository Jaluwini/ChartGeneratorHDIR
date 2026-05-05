import { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportData from "highcharts/modules/export-data";
import HighchartsOfflineExporting from "highcharts/modules/offline-exporting";

HighchartsExporting(Highcharts);
HighchartsExportData(Highcharts);
HighchartsOfflineExporting(Highcharts);
import { AlertCircle, BarChart2 } from "lucide-react";

export default function ChartPreview({ hcConfig, onChartReady }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!hcConfig) {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      setError(null);
      return;
    }

    setError(null);

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const chart = Highcharts.chart(containerRef.current, {
      ...hcConfig,
      chart: {
        ...hcConfig.chart,
        animation: { duration: 400 },
        style: { fontFamily: "Inter, sans-serif" }
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ["downloadPNG", "downloadJPEG", "downloadSVG", "downloadPDF", "separator", "downloadCSV", "downloadXLS"]
          }
        }
      }
    });

    chartRef.current = chart;
    if (onChartReady) onChartReady(chart);
  }, [hcConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  if (!hcConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-16">
        <div className="p-4 rounded-2xl bg-muted/50">
          <BarChart2 className="w-8 h-8 opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Ingen graf å forhåndsvise</p>
          <p className="text-xs mt-1 opacity-70">Last opp data og konfigurer grafinnstillinger</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 text-destructive text-sm m-4">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}