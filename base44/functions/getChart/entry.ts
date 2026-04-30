import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// --- Inline data fetching from Helsedirektoratet ---
const HELSEDIR_BASE_URL = "https://api.helsedirektoratet.no/innhold/nki/kvalitetsindikatorer/";
const NO_DATA_SENTINEL = -1e7;

function parseYear(isoStr) {
  if (!isoStr) return null;
  return isoStr.slice(0, 4);
}

async function fetchFreshRows(chart_config, jsonUrl) {
  const apiKey = Deno.env.get("HELSEDIR_API_KEY");
  const headers = {
    'Accept': 'application/json',
    ...(apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {})
  };

  const res = await fetch(jsonUrl, { headers });
  if (!res.ok) throw new Error(`Helsedir API feil: ${res.status}`);
  const payload = await res.json();

  const rawRows = payload?.AttachmentDataRows;
  if (!Array.isArray(rawRows) || rawRows.length === 0) throw new Error("Ingen data funnet.");

  const validRows = rawRows.filter(row => {
    const v = parseFloat(row.Value);
    return !isNaN(v) && Math.abs(v - NO_DATA_SENTINEL) > 1;
  });

  if (validRows.length === 0) throw new Error("Alle datapunkter mangler verdi.");

  // Read stored filter selections from chart_config if available
  const measureTypes = [...new Set(validRows.map(r => r.MeasureType).filter(Boolean))];
  const hasNational = validRows.some(r => !r.LocationParentId || r.LocationParentId === 0);
  const hasRHF = validRows.some(r => r.LocationParentId === 1);

  // Use the filters that were active when chart was saved (stored in chart_config)
  const selectedMeasureType = chart_config?.savedMeasureType || measureTypes[0];
  const selectedEnhetType = chart_config?.savedEnhetType || (hasNational ? "Nasjonalt" : hasRHF ? "RHF" : "Sykehus");

  let filtered = validRows.filter(r => r.MeasureType === selectedMeasureType);
  if (selectedEnhetType === "Nasjonalt") {
    filtered = filtered.filter(r => !r.LocationParentId || r.LocationParentId === 0);
  } else if (selectedEnhetType === "RHF") {
    filtered = filtered.filter(r => r.LocationParentId === 1);
  } else {
    filtered = filtered.filter(r => r.LocationParentId > 1);
  }

  return filtered.map(row => ({
    År: parseYear(row.TimeFrom),
    Enhet: row.LocationName || "",
    Overordnet: row.ParentName || "",
    Verdi: parseFloat(parseFloat(row.Value).toFixed(4)),
    Måletype: row.MeasureType || "",
  }));
}

// --- Inline Highcharts config builder (mirrors lib/chartUtils.js) ---
const DEFAULT_COLORS = [
  "#4f6ef7", "#34d399", "#f59e0b", "#f472b6", "#60a5fa",
  "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9", "#38bdf8"
];

function cleanNumeric(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const cleaned = String(v).replace(/[\s\u00a0_']/g, "").replace(/,/g, ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
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

function buildHighchartsConfig(config, data) {
  const {
    chartType, xAxis, yAxes, groupBy,
    title, subtitle, xAxisTitle, yAxisTitle,
    colors, dataLabels, legend, sortData,
    decimals, height, width, tooltipFormat
  } = config;

  if (!data || data.length === 0) return null;
  if (!xAxis || !yAxes || yAxes.length === 0) return null;

  const fmt = buildFormatter(config);
  const fmtTooltip = buildFormatter(config, true, true);

  const actualType = chartType === "column_stacked" ? "column" : chartType;
  const isStacked = chartType === "column_stacked";
  const isPie = chartType === "pie";

  let workingData = [...data];
  if (sortData && sortData !== "none" && xAxis) {
    workingData.sort((a, b) => {
      const va = a[xAxis]; const vb = b[xAxis];
      const aNum = cleanNumeric(va); const bNum = cleanNumeric(vb);
      if (!isNaN(aNum) && !isNaN(bNum)) return sortData === "asc" ? aNum - bNum : bNum - aNum;
      return sortData === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const themeColors = colors && colors.length > 0 ? colors : DEFAULT_COLORS;

  if (isPie) {
    const yCol = yAxes[0];
    return {
      chart: { type: "pie", height: height || 400, width: width || null },
      title: { text: title || "" },
      subtitle: { text: subtitle || "" },
      colors: themeColors,
      series: [{ name: yCol, data: workingData.map((row, i) => ({ name: String(row[xAxis] ?? ""), y: cleanNumeric(row[yCol]) || 0, color: themeColors[i % themeColors.length] })) }],
      legend: { enabled: legend !== false },
      credits: { enabled: false }, exporting: { enabled: false }
    };
  }

  if (chartType === "scatter") {
    const yCol = yAxes[0];
    return {
      chart: { type: "scatter", height: height || 400, width: width || null },
      title: { text: title || "" }, subtitle: { text: subtitle || "" }, colors: themeColors,
      xAxis: { title: { text: xAxisTitle || xAxis }, gridLineWidth: 1 },
      yAxis: { title: { text: yAxisTitle || yCol }, gridLineWidth: 1 },
      series: [{ name: yCol, data: workingData.map(row => ({ x: cleanNumeric(row[xAxis]) || 0, y: cleanNumeric(row[yCol]) || 0 })) }],
      legend: { enabled: legend !== false },
      credits: { enabled: false }, exporting: { enabled: false }
    };
  }

  const categories = [...new Set(workingData.map(row => String(row[xAxis] ?? "")))];
  let series = [];

  if (groupBy && groupBy !== "none" && groupBy !== xAxis) {
    const groups = [...new Set(workingData.map(row => String(row[groupBy] ?? "")))];
    const yCol = yAxes[0];
    series = groups.map((group, gi) => {
      const catMap = {};
      workingData.filter(row => String(row[groupBy]) === group).forEach(row => { catMap[String(row[xAxis])] = cleanNumeric(row[yCol]) || 0; });
      return { name: group, type: actualType, data: categories.map(cat => catMap[cat] ?? null), color: themeColors[gi % themeColors.length] };
    });
  } else {
    series = yAxes.map((yCol, yi) => ({
      name: yCol, type: actualType,
      data: workingData.map(row => cleanNumeric(row[yCol]) || 0),
      color: themeColors[yi % themeColors.length]
    }));
  }

  return {
    chart: { type: actualType, height: height || 400, width: width || null },
    title: { text: title || "" },
    subtitle: { text: subtitle || "" },
    colors: themeColors,
    xAxis: { categories, title: { text: xAxisTitle || xAxis || "" }, crosshair: true, tickInterval: config.xTickInterval || undefined },
    yAxis: {
      title: { text: yAxisTitle || (yAxes[0] || "") }, gridLineWidth: 1,
      tickInterval: config.yTickInterval || undefined,
      ...(isStacked ? { stackLabels: { enabled: dataLabels === true } } : {})
    },
    plotOptions: {
      series: { dataLabels: { enabled: dataLabels === true } },
      ...(isStacked ? { column: { stacking: "normal" } } : {})
    },
    legend: { enabled: legend !== false },
    tooltip: tooltipFormat ? { pointFormat: tooltipFormat } : { shared: true },
    series,
    credits: { enabled: false }, exporting: { enabled: false }
  };
}

// --- Main handler ---
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    // If no ID provided, return list of all exposed charts
    if (!id) {
      const allCharts = await base44.asServiceRole.entities.SavedChart.list();
      const exposedCharts = allCharts
        .filter(c => c.exposed_in_api)
        .map(c => ({
          id: c.id,
          title: c.title || "Uten tittel",
          chart_type: c.chart_type,
          api_source: c.api_source,
          created_date: c.created_date,
          updated_date: c.updated_date,
        }));
      return Response.json({ charts: exposedCharts });
    }

    // If ID provided, return full chart details with hc_config
    let chart;
    try {
      chart = await base44.asServiceRole.entities.SavedChart.get(id);
    } catch {
      return Response.json({ error: "Graf ikke funnet" }, { status: 404 });
    }
    if (!chart) return Response.json({ error: "Graf ikke funnet" }, { status: 404 });
    if (!chart.exposed_in_api) return Response.json({ error: "Denne grafen er ikke eksponert i API" }, { status: 403 });

    let hc_config = chart.hc_config;

    // If this chart was built from Helsedirektoratet API, rebuild hc_config from fresh data
    if (chart.api_source === "helsedirektoratet" && chart.chart_config) {
      const chart_config = chart.chart_config;
      const jsonUrl = chart_config?.savedJsonUrl;

      if (jsonUrl) {
        const freshRows = await fetchFreshRows(chart_config, jsonUrl);
        hc_config = buildHighchartsConfig(chart_config, freshRows);
      }
    }

    return Response.json({
      id: chart.id,
      title: chart.title,
      chart_type: chart.chart_type,
      api_source: chart.api_source,
      created_date: chart.created_date,
      updated_date: chart.updated_date,
      hc_config,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});