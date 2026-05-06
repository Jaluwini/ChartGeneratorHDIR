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
  { value: "line_column", label: "Line + Column" },
];

function cleanNumeric(v) {
  if (v === null || v === undefined || v === "") return NaN;
  // Remove thousand separators: spaces, dots, underscores, apostrophes — then parse
  const cleaned = String(v).replace(/[\s\u00a0_']/g, "").replace(/,/g, ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
}

// Date patterns: ISO dates, Norwegian dates (dd.mm.yyyy), year-only, year-month
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}(T.*)?$/,          // ISO 8601
  /^\d{2}[.\-\/]\d{2}[.\-\/]\d{4}$/,    // dd.mm.yyyy
  /^\d{4}$/,                              // year only
  /^\d{4}[-\/]\d{2}$/,                   // year-month
  /^Q[1-4]\s?\d{4}$/i,                   // Q1 2024
];

function looksLikeDate(v) {
  const s = String(v).trim();
  return DATE_PATTERNS.some(re => re.test(s));
}

export function detectColumnType(data, columnName) {
  if (!data || data.length === 0) return "string";
  const sample = data.slice(0, 30)
    .map(row => row[columnName])
    .filter(v => v !== null && v !== undefined && v !== "");
  if (sample.length === 0) return "string";

  const numericCount = sample.filter(v => !isNaN(cleanNumeric(v))).length;
  if (numericCount / sample.length >= 0.7) return "number";

  const dateCount = sample.filter(v => looksLikeDate(v)).length;
  if (dateCount / sample.length >= 0.7) return "date";

  // Heuristic: if cardinality is low relative to total rows → likely a category
  const unique = new Set(sample.map(v => String(v))).size;
  if (unique <= Math.max(3, sample.length * 0.4)) return "category";

  return "string";
}

export function detectColumns(data) {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map(name => ({ name, type: detectColumnType(data, name) }));
}

/**
 * Analyses detected columns and returns smart defaults for xAxis, yAxes and chartType.
 * Priority: date > category > string for X-axis; number columns for Y-axes.
 */
export function suggestChartConfig(columns) {
  if (!columns || columns.length === 0) return {};

  // X-axis preference: date first, then category, then any string
  const dateCols = columns.filter(c => c.type === "date");
  const categoryCols = columns.filter(c => c.type === "category");
  const stringCols = columns.filter(c => c.type === "string");
  const numericCols = columns.filter(c => c.type === "number");

  const xCol = dateCols[0] || categoryCols[0] || stringCols[0] || columns[0];
  const yCols = numericCols.slice(0, 2).map(c => c.name);

  // Chart type suggestion
  let chartType = "column";
  if (dateCols.length > 0) chartType = "line";                    // time series → line
  if (yCols.length > 1) chartType = "line";                       // multiple series → line
  if (categoryCols.length > 0 && yCols.length === 1) chartType = "bar"; // few categories → bar
  if (numericCols.length === 0) chartType = "column";             // fallback

  return {
    xAxis: xCol?.name || null,
    yAxes: yCols,
    chartType,
  };
}

function buildFormatter(config, noScale = false, noAffixes = false) {
  const scale = noScale ? "none" : (config.numberScale || "none");
  const divisor = scale === "thousands" ? 1000 : scale === "millions" ? 1000000 : scale === "billions" ? 1000000000 : 1;
  const dec = config.decimals ?? 0;
  const dp = config.decimalPoint === "comma" ? "," : ".";
  const ts = config.thousandsSep === "comma" ? "," : config.thousandsSep === "dot" ? "." : config.thousandsSep === "none" ? "" : "\u00a0";
  const prefix = noAffixes ? "" : (config.prefix || "");
  const suffix = noAffixes ? "" : (config.suffix || "");

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
  const fmtTooltip = buildFormatter(config, true, true); // full tall i tooltip, ingen skalering eller prefix/suffix

  if (!data || data.length === 0) return null;
  if (!xAxis || !yAxes || yAxes.length === 0) return null;

  const actualType = chartType === "column_stacked" ? "column" : chartType === "line_column" ? "column" : chartType;
  const isStacked = chartType === "column_stacked";
  const isLineColumn = chartType === "line_column";
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
      _appConfig: config,
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
      _appConfig: config,
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
    series = yAxes.map((yCol, yi) => {
      let serieType = actualType;
      if (isLineColumn) {
        serieType = config.serieTypes?.[yCol] || "column";
      }
      return {
        name: yCol,
        type: serieType,
        data: workingData.map(row => cleanNumeric(row[yCol]) || 0),
        dataLabels: {
          enabled: dataLabels === true,
          formatter: function() { return fmt(this.y); }
        },
        color: themeColors[yi % themeColors.length]
      };
    });
  }

  const hcConfig = {
    _appConfig: config,
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
      crosshair: true,
      tickInterval: config.xTickInterval || undefined
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
              s += `<span style="color:${pt.color}">●</span> ${pt.series.name}: <b>${fmtTooltip(pt.y)}</b><br/>`;
            });
            return s;
          }
        },
    series,
    credits: config.sourceName
      ? { enabled: true, text: `Kilde: ${config.sourceName}`, href: config.sourceUrl || null, style: { cursor: config.sourceUrl ? "pointer" : "default", color: config.sourceUrl ? "#4f6ef7" : "#888", fontSize: "11px" } }
      : { enabled: false },
    exporting: { enabled: false }
  };

  return hcConfig;
}

export function configToHTML(hcConfig, apiSource) {
  // Remove null width so Highcharts auto-sizes in the exported HTML
  // Keep _appConfig so the chart can be fully reconstructed later
  const exportConfig = { ...hcConfig, chart: { ...hcConfig.chart, width: undefined } };
  const jsonStr = JSON.stringify(exportConfig, null, 2);

  const sourceFooter = apiSource === "helsedirektoratet"
    ? `<p style="text-align:center;font-size:12px;color:#888;margin-top:12px;">Kilde: <a href="https://www.helsedirektoratet.no" target="_blank" style="color:#555;">Helsedirektoratet</a></p>`
    : "";

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
  ${sourceFooter}
  <script>
    Highcharts.chart('chart-container', ${jsonStr});
  <\/script>
</body>
</html>`;
}