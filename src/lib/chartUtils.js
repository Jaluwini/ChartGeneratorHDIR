export const DEFAULT_COLORS = [
  "#4f6ef7", "#34d399", "#f59e0b", "#f472b6", "#60a5fa",
  "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9", "#38bdf8"
];

export const CHART_TYPES = [
  { value: "line", label: "Line" },
  { value: "column", label: "Column" },
  { value: "bar", label: "Bar" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "scatter", label: "Scatter" },
  { value: "column_stacked", label: "Stacked Column" },
];

function cleanNumeric(v) {
  if (v === null || v === undefined || v === "") return NaN;
  // Remove thousand separators: spaces, dots, underscores, apostrophes — then parse
  const cleaned = String(v).replace(/[\s\u00a0_']/g, "").replace(/,/g, ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
}

export function detectColumnType(data, columnName) {
  if (!data || data.length === 0) return "string";
  const sample = data.slice(0, 20).map(row => row[columnName]).filter(v => v !== null && v !== undefined && v !== "");
  const numericCount = sample.filter(v => !isNaN(cleanNumeric(v))).length;
  return numericCount / sample.length >= 0.7 ? "number" : "string";
}

export function detectColumns(data) {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map(name => ({ name, type: detectColumnType(data, name) }));
}

function buildFormatter(config, noScale = false) {
  const scale = noScale ? "none" : (config.numberScale || "none");
  const divisor = scale === "thousands" ? 1000 : scale === "millions" ? 1000000 : scale === "billions" ? 1000000000 : 1;
  const dec = config.decimals ?? 0;
  const dp = config.decimalPoint === "comma" ? "," : ".";
  const ts = config.thousandsSep === "comma" ? "," : config.thousandsSep === "dot" ? "." : config.thousandsSep === "none" ? "" : "\u00a0";
  const prefix = config.prefix || "";
  const suffix = config.suffix || "";

  return (val) => {
    if (val === null || val === undefined || isNaN(val)) return "";
    const scaled = val / divisor;
    const [intPart, decPart] = scaled.toFixed(dec).split(".");
    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ts);
    const number = dec > 0 ? intFormatted + dp + decPart : intFormatted;
    return prefix + number + suffix;
  };
}

export function buildHighchartsConfig(config, data) {
  const {
    chartType, xAxis, yAxes, groupBy,
    title, subtitle, xAxisTitle, yAxisTitle,
    colors, dataLabels, legend, sortData,
    decimals, height, width, tooltipFormat
  } = config;

  const fmt = buildFormatter(config);
  const fmtTooltip = buildFormatter(config, true); // full tall i tooltip, ingen skalering

  if (!data || data.length === 0) return null;
  if (!xAxis || !yAxes || yAxes.length === 0) return null;

  const actualType = chartType === "column_stacked" ? "column" : chartType;
  const isStacked = chartType === "column_stacked";
  const isPie = chartType === "pie";

  let workingData = [...data];
  if (sortData && sortData !== "none" && xAxis) {
    workingData.sort((a, b) => {
      const va = a[xAxis];
      const vb = b[xAxis];
      const aNum = cleanNumeric(va);
      const bNum = cleanNumeric(vb);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortData === "asc" ? aNum - bNum : bNum - aNum;
      }
      return sortData === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }

  const themeColors = colors && colors.length > 0 ? colors : DEFAULT_COLORS;

  // PIE chart
  if (isPie) {
    const yCol = yAxes[0];
    const pieData = workingData.map((row, i) => ({
      name: String(row[xAxis] ?? ""),
      y: cleanNumeric(row[yCol]) || 0,
      color: themeColors[i % themeColors.length]
    }));

    return {
      chart: { type: "pie", height: height || 400, width: width || null },
      title: { text: title || "" },
      subtitle: { text: subtitle || "" },
      colors: themeColors,
      series: [{
        name: yCol,
        data: pieData,
        dataLabels: {
          enabled: dataLabels !== false,
          formatter: function() { return `<b>${this.point.name}</b>: ${fmt(this.y)} (${this.percentage.toFixed(1)}%)`; }
        }
      }],
      legend: { enabled: legend !== false },
      tooltip: {
        formatter: tooltipFormat ? undefined : function() { return `<b>${this.point.name}</b>: <b>${fmtTooltip(this.y)}</b> (${this.percentage.toFixed(1)}%)`; },
        pointFormat: tooltipFormat || undefined,
      },
      credits: { enabled: false },
      exporting: { enabled: false }
    };
  }

  // SCATTER chart
  if (chartType === "scatter") {
    const yCol = yAxes[0];
    const scatterData = workingData.map(row => ({
      x: cleanNumeric(row[xAxis]) || 0,
      y: cleanNumeric(row[yCol]) || 0,
      name: String(row[xAxis] ?? "")
    }));

    return {
      chart: { type: "scatter", height: height || 400, width: width || null },
      title: { text: title || "" },
      subtitle: { text: subtitle || "" },
      colors: themeColors,
      xAxis: { title: { text: xAxisTitle || xAxis }, gridLineWidth: 1 },
      yAxis: { title: { text: yAxisTitle || yCol }, gridLineWidth: 1 },
      series: [{
        name: yCol,
        data: scatterData,
        dataLabels: { enabled: dataLabels === true, formatter: function() { return fmt(this.y); } }
      }],
      legend: { enabled: legend !== false },
      tooltip: {
        formatter: tooltipFormat ? undefined : function() { return `<b>${this.point.name}</b>: (${fmtTooltip(this.x)}, ${fmtTooltip(this.y)})`; },
        pointFormat: tooltipFormat || undefined,
      },
      credits: { enabled: false },
      exporting: { enabled: false }
    };
  }

  // GROUPED series (multiple Y or groupBy)
  const categories = [...new Set(workingData.map(row => String(row[xAxis] ?? "")))];
  let series = [];

  if (groupBy && groupBy !== "none" && groupBy !== xAxis) {
    const groups = [...new Set(workingData.map(row => String(row[groupBy] ?? "")))];
    const yCol = yAxes[0];
    series = groups.map((group, gi) => {
      const groupRows = workingData.filter(row => String(row[groupBy]) === group);
      const catMap = {};
      groupRows.forEach(row => { catMap[String(row[xAxis])] = cleanNumeric(row[yCol]) || 0; });
      return {
        name: group,
        type: actualType,
        data: categories.map(cat => catMap[cat] ?? null),
        dataLabels: {
          enabled: dataLabels === true,
          formatter: function() { return fmt(this.y); }
        },
        color: themeColors[gi % themeColors.length]
      };
    });
  } else {
    series = yAxes.map((yCol, yi) => ({
      name: yCol,
      type: actualType,
      data: workingData.map(row => cleanNumeric(row[yCol]) || 0),
      dataLabels: {
        enabled: dataLabels === true,
        formatter: function() { return fmt(this.y); }
      },
      color: themeColors[yi % themeColors.length]
    }));
  }

  const hcConfig = {
    chart: {
      type: actualType,
      height: height || 400,
      width: width || null
    },
    title: { text: title || "" },
    subtitle: { text: subtitle || "" },
    colors: themeColors,
    xAxis: {
      categories,
      title: { text: xAxisTitle || xAxis || "" },
      crosshair: true
    },
    yAxis: {
      title: { text: yAxisTitle || (yAxes[0] || "") },
      gridLineWidth: 1,
      tickInterval: config.yTickInterval || undefined,
      stackLabels: isStacked ? { enabled: dataLabels === true, formatter: function() { return fmt(this.total); } } : undefined,
      labels: { formatter: function() { return fmt(this.value); } }
    },
    plotOptions: {
      series: {
        dataLabels: { enabled: dataLabels === true, formatter: function() { return fmt(this.y); } }
      },
      ...(isStacked ? { column: { stacking: "normal" } } : {})
    },
    legend: { enabled: legend !== false },
    tooltip: tooltipFormat
      ? { pointFormat: tooltipFormat }
      : {
          shared: true,
          formatter: function() {
            let s = `<span style="font-size:11px">${this.x}</span><br/>`;
            this.points.forEach(pt => {
              s += `<span style="color:${pt.color}">●</span> ${pt.series.name}: <b>${fmt(pt.y)}</b><br/>`;
            });
            return s;
          }
        },
    series,
    credits: { enabled: false },
    exporting: { enabled: false }
  };

  return hcConfig;
}

export function configToHTML(hcConfig) {
  // Remove null width so Highcharts auto-sizes in the exported HTML
  const exportConfig = { ...hcConfig, chart: { ...hcConfig.chart, width: undefined } };
  const jsonStr = JSON.stringify(exportConfig, null, 2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${hcConfig?.title?.text || "Highcharts Chart"}</title>
  <script src="https://code.highcharts.com/highcharts.js"><\/script>
  <script src="https://code.highcharts.com/modules/exporting.js"><\/script>
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; background: #f8f9fa; }
    #chart-container { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  </style>
</head>
<body>
  <div id="chart-container"></div>
  <script>
    Highcharts.chart('chart-container', ${jsonStr});
  <\/script>
</body>
</html>`;
}