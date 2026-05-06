import { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsMore from "highcharts/highcharts-more";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsOfflineExporting from "highcharts/modules/offline-exporting";
import { AlertCircle } from "lucide-react";

HighchartsMore(Highcharts);
HighchartsExporting(Highcharts);
HighchartsOfflineExporting(Highcharts);

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

    try {
      const chart = Highcharts.chart(containerRef.current, {
        ...hcConfig,
        chart: {
          ...hcConfig.chart,
          animation: { duration: 300 },
          style: { fontFamily: "Inter, sans-serif" },
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