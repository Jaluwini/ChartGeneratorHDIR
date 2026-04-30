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

export function detectColumnType(data, columnName) {
  if (!data || data.length === 0) return "string";
  const sample = data.slice(0, 20).map(row => row[columnName]).filter(v => v !== null && v !== undefined && v !== "");
  const numericCount = sample.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
  return numericCount / sample.length >= 0.7 ? "number" : "string";
}

export function detectColumns(data) {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map(name => ({ name, type: detectColumnType(data, name) }));
}

export function buildHighchartsConfig(config, data) {
  const {
    chartType, xAxis, yAxes, groupBy,
    title, subtitle, xAxisTitle, yAxisTitle,
    colors, dataLabels, legend, sortData,
    decimals, height, width, tooltipFormat
  } = config;

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
      const aNum = parseFloat(va);
      const bNum = parseFloat(vb);
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
      y: parseFloat(row[yCol]) || 0,
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
          format: `<b>{point.name}</b>: {point.percentage:.${decimals ?? 1}f}%`
        }
      }],
      legend: { enabled: legend !== false },
      tooltip: {
        pointFormat: tooltipFormat || `<b>{point.name}</b>: <b>{point.y:.${decimals ?? 0}f}</b> ({point.percentage:.1f}%)`
      },
      credits: { enabled: false },
      exporting: { enabled: false }
    };
  }

  // SCATTER chart
  if (chartType === "scatter") {
    const yCol = yAxes[0];
    const scatterData = workingData.map(row => ({
      x: parseFloat(row[xAxis]) || 0,
      y: parseFloat(row[yCol]) || 0,
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
        dataLabels: { enabled: dataLabels === true }
      }],
      legend: { enabled: legend !== false },
      tooltip: {
        pointFormat: tooltipFormat || `<b>{point.name}</b>: ({point.x}, {point.y:.${decimals ?? 0}f})`
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
      groupRows.forEach(row => { catMap[String(row[xAxis])] = parseFloat(row[yCol]) || 0; });
      return {
        name: group,
        type: actualType,
        data: categories.map(cat => catMap[cat] ?? null),
        dataLabels: {
          enabled: dataLabels === true,
          format: `{y:.${decimals ?? 0}f}`
        },
        color: themeColors[gi % themeColors.length]
      };
    });
  } else {
    series = yAxes.map((yCol, yi) => ({
      name: yCol,
      type: actualType,
      data: workingData.map(row => parseFloat(row[yCol]) || 0),
      dataLabels: {
        enabled: dataLabels === true,
        format: `{y:.${decimals ?? 0}f}`
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
      stackLabels: isStacked ? { enabled: dataLabels === true } : undefined
    },
    plotOptions: {
      series: {
        dataLabels: { enabled: dataLabels === true, format: `{y:.${decimals ?? 0}f}` }
      },
      ...(isStacked ? { column: { stacking: "normal" } } : {})
    },
    legend: { enabled: legend !== false },
    tooltip: tooltipFormat
      ? { pointFormat: tooltipFormat }
      : {
          shared: true,
          valueDecimals: decimals ?? 0,
          headerFormat: `<span style="font-size:11px">{point.key}</span><br/>`
        },
    series,
    credits: { enabled: false },
    exporting: { enabled: false }
  };

  return hcConfig;
}

export function configToHTML(hcConfig) {
  const jsonStr = JSON.stringify(hcConfig, null, 2);
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