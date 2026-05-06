function clean(v) {
  if (v === null || v === undefined || v === "" || v === "-") return null;
  const s = String(v).replace(/[\s\u00a0]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function getDiamondColor(value, reference, config) {
  if (value === null) return config.colorMissing || "#ffffff";
  if (config.colorMode === "absolute") {
    const diff = value - (reference ?? value);
    const good = config.higherIsBetter !== false ? diff >= (config.thresholdGood ?? 0) : diff <= -(config.thresholdGood ?? 0);
    const bad = config.higherIsBetter !== false ? diff <= (config.thresholdBad ?? 0) : diff >= -(config.thresholdBad ?? 0);
    if (good) return config.colorGood || "#22c55e";
    if (bad) return config.colorBad || "#ef4444";
    return config.colorNeutral || "#f59e0b";
  }
  if (reference === null || reference === 0) return config.colorMissing || "#ffffff";
  const pctDiff = ((value - reference) / Math.abs(reference)) * 100;
  const effectiveDiff = config.higherIsBetter !== false ? pctDiff : -pctDiff;
  const tGood = config.thresholdGood ?? 5;
  const tBad = config.thresholdBad ?? -5;
  if (effectiveDiff >= tGood) return config.colorGood || "#22c55e";
  if (effectiveDiff <= tBad) return config.colorBad || "#ef4444";
  return config.colorNeutral || "#f59e0b";
}

export function buildBarometerConfig(config, data) {
  const {
    colIndicator, colValue, colReference, colMin, colMax,
    colUnit, colPeriod, colTheme, colColor,
    colorMode,
    colorGood, colorNeutral, colorBad, colorMissing,
    barColor, referenceLineColor, diamondSize,
    title, subtitle, decimals, valueSuffix,
    showReferenceBar, referenceLineFixed,
    height
  } = config;

  if (!data || data.length === 0 || !colIndicator || !colValue) return null;

  // Process rows — keep original order, first row = top of chart
  const rows = data.map((row, i) => {
    const value = clean(row[colValue]);
    const reference = colReference ? clean(row[colReference]) : null;
    const minVal = colMin ? clean(row[colMin]) : null;
    const maxVal = colMax ? clean(row[colMax]) : null;
    const unit = colUnit ? (row[colUnit] || "") : (valueSuffix || "");
    const period = colPeriod ? (row[colPeriod] || "") : "";
    const theme = colTheme ? (row[colTheme] || "") : null;
    const indicatorLabel = String(row[colIndicator] || `Indikator ${i + 1}`);

    let color;
    if (colorMode === "column" && colColor) {
      const raw = String(row[colColor] || "").toLowerCase();
      if (raw === "red" || raw === "rød") color = colorBad || "#ef4444";
      else if (raw === "green" || raw === "grønn") color = colorGood || "#22c55e";
      else if (raw === "yellow" || raw === "gul") color = colorNeutral || "#f59e0b";
      else color = colorMissing || "#ffffff";
    } else {
      color = getDiamondColor(value, reference, config);
    }

    return { indicatorLabel, value, reference, minVal, maxVal, unit, period, theme, color, rowIndex: i };
  });

  // With inverted chart: xAxis is vertical (categories), yAxis is horizontal (values).
  // Categories on xAxis: first row at top means index 0 at top → use reversed: false on xAxis
  // We map row index directly: row 0 = xAxis category 0 = top
  const categories = rows.map(r => r.indicatorLabel);

  // Determine value axis (yAxis) range
  const allValues = rows.flatMap(r => [r.value, r.minVal, r.maxVal, r.reference].filter(v => v !== null));
  const yMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const yMax = allValues.length > 0 ? Math.max(...allValues) : 100;
  const yPad = (yMax - yMin) * 0.1;

  // Series 1: gray variation bars (columnrange)
  // columnrange uses x=category index, low/high=value range
  const hasRangeData = rows.some(r => r.minVal !== null && r.maxVal !== null);
  const rangeSeries = hasRangeData && showReferenceBar !== false ? [{
    name: "Variasjon mellom fylkene",
    type: "columnrange",
    data: rows.map((r, xi) => {
      if (r.minVal === null || r.maxVal === null) return null;
      return { x: xi, low: r.minVal, high: r.maxVal, color: barColor || "#cccccc" };
    }),
    color: barColor || "#cccccc",
    groupPadding: 0,
    pointPadding: 0.2,
    borderWidth: 0,
    enableMouseTracking: false,
    showInLegend: true,
    legendSymbol: "rectangle",
  }] : [];

  // Series 2: per-row reference line — scatter with "line" symbol (horizontal in normal chart = vertical in inverted)
  const refLineColor = referenceLineColor || "#cc0000";
  const refLineSeries = (colReference && hasRangeData) ? [{
    name: "Nasjonalt gjennomsnitt",
    type: "scatter",
    data: rows.map((r, xi) =>
      r.reference !== null ? { x: xi, y: r.reference } : null
    ),
    color: refLineColor,
    marker: {
      symbol: "line",
      lineWidth: 2,
      lineColor: refLineColor,
      radius: 10,
    },
    showInLegend: true,
    enableMouseTracking: false,
    zIndex: 3,
  }] : [];

  const refDotSeries = (!hasRangeData && colReference) ? [{
    name: "Nasjonalt gjennomsnitt",
    type: "scatter",
    data: rows.map((r, xi) =>
      r.reference !== null ? { x: xi, y: r.reference } : null
    ),
    marker: {
      symbol: "diamond",
      radius: (diamondSize || 8) * 0.8,
      lineWidth: 1.5,
      lineColor: "#555",
      fillColor: "#fff",
    },
    showInLegend: true,
    enableMouseTracking: false,
  }] : [];

  // Series 3: main value diamonds grouped by color for legend
  const colorGroups = {
    [colorGood || "#22c55e"]: { name: "Bedre enn referanse", color: colorGood || "#22c55e", data: [] },
    [colorNeutral || "#f59e0b"]: { name: "På nivå med referanse", color: colorNeutral || "#f59e0b", data: [] },
    [colorBad || "#ef4444"]: { name: "Dårligere enn referanse", color: colorBad || "#ef4444", data: [] },
    [colorMissing || "#ffffff"]: { name: "Manglende data", color: colorMissing || "#ffffff", data: [] },
  };

  rows.forEach((r, xi) => {
    const grp = colorGroups[r.color] || colorGroups[colorNeutral || "#f59e0b"];
    if (r.value !== null) {
      grp.data.push({ x: xi, y: r.value, tooltipData: r });
    }
  });

  const diamondSeries = Object.values(colorGroups)
    .filter(g => g.data.length > 0)
    .map(g => ({
      name: g.name,
      type: "scatter",
      data: g.data,
      color: g.color,
      marker: {
        symbol: "diamond",
        radius: diamondSize || 8,
        lineWidth: g.color === (colorMissing || "#ffffff") ? 1.5 : 0,
        lineColor: g.color === (colorMissing || "#ffffff") ? "#999" : g.color,
        fillColor: g.color,
      },
      showInLegend: true,
      zIndex: 5,
    }));

  // Theme plotBands on xAxis (vertical axis after inversion)
  const xPlotBands = [];
  const themeSegments = [];
  if (colTheme) {
    const themes = [];
    let currentTheme = null;
    let startIdx = 0;
    rows.forEach((r, i) => {
      if (r.theme !== currentTheme) {
        if (currentTheme !== null) {
          themes.push({ theme: currentTheme, from: startIdx - 0.5, to: i - 0.5, midpoint: (startIdx + i - 1) / 2 });
        }
        currentTheme = r.theme;
        startIdx = i;
      }
    });
    if (currentTheme !== null) {
      themes.push({ theme: currentTheme, from: startIdx - 0.5, to: rows.length - 0.5, midpoint: (startIdx + rows.length - 1) / 2 });
    }
    const bandColors = ["#f8f9fa", "#ffffff"];
    themes.forEach((t, i) => {
    themeSegments.push(t);
    xPlotBands.push({
      from: t.from,
      to: t.to,
      color: bandColors[i % 2],
      label: {
        text: t.theme,
        align: "right",
        verticalAlign: "middle",
        x: 130,
        style: {
          fontSize: "9px",
          fontWeight: "700",
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
        },
      },
      zIndex: 1,
    });
    });
  }

  // Reference plotLine on yAxis (horizontal value axis)
  const yPlotLines = [];

  // Fixed reference line
  if (referenceLineFixed !== null && referenceLineFixed !== undefined && referenceLineFixed !== "") {
    yPlotLines.push({
      value: parseFloat(referenceLineFixed),
      color: referenceLineColor || "#cc0000",
      width: 2,
      zIndex: 4,
      label: {
        text: "Ref.",
        align: "left",
        style: { color: referenceLineColor || "#cc0000", fontSize: "10px" },
      },
    });
  }



  const hasThemes = themeSegments.length > 0;
  const marginRight = hasThemes ? 140 : 60;

  return {
    chart: {
      type: "scatter",
      inverted: true,
      height: height || Math.max(400, rows.length * 28 + 120),
      marginLeft: 320,
      marginRight,
      style: { fontFamily: "Inter, sans-serif" },
    },
    title: { text: title || "", style: { fontSize: "15px", fontWeight: "600" } },
    subtitle: { text: subtitle || "" },
    // xAxis = vertical after inversion → shows indicator categories
    xAxis: {
      categories,
      title: { text: "" },
      gridLineWidth: 1,
      gridLineColor: "#e5e7eb",
      plotBands: xPlotBands,
      labels: {
        style: { fontSize: "11px", color: "#374151" },
        align: "right",
      },
      lineWidth: 0,
      tickLength: 0,
      tickInterval: 1,
      reversed: false,
    },
    // yAxis = horizontal after inversion → shows numeric values
    yAxis: {
      min: yMin - yPad,
      max: yMax + yPad,
      title: { text: "" },
      gridLineWidth: 1,
      gridLineColor: "#e5e7eb",
      plotLines: yPlotLines,
      labels: {
        formatter: function () {
          return this.value.toFixed(decimals ?? 1) + (valueSuffix ? ` ${valueSuffix}` : "");
        },
        style: { fontSize: "10px" },
      },
      tickLength: 0,
    },
    legend: {
      enabled: true,
      align: "right",
      verticalAlign: "top",
      layout: "horizontal",
      itemStyle: { fontSize: "10px", fontWeight: "500", color: "#555" },
      symbolRadius: 0,
      itemMarginTop: 2,
    },
    tooltip: {
      useHTML: true,
      formatter: function () {
        const td = this.point.tooltipData;
        if (!td) return `<b>${this.series.name}</b>`;
        const dec = decimals ?? 1;
        const suf = td.unit || valueSuffix || "";
        let html = `<div style="font-family:Inter,sans-serif;font-size:12px;max-width:240px;">`;
        html += `<div style="font-weight:600;margin-bottom:4px;">${td.indicatorLabel}</div>`;
        if (td.value !== null) html += `<div>Verdi: <b>${td.value.toFixed(dec)}${suf ? " " + suf : ""}</b></div>`;
        if (td.reference !== null) html += `<div>Referanse: <b>${td.reference.toFixed(dec)}${suf ? " " + suf : ""}</b></div>`;
        if (td.minVal !== null && td.maxVal !== null) html += `<div>Variasjon: <b>${td.minVal.toFixed(dec)} – ${td.maxVal.toFixed(dec)}${suf ? " " + suf : ""}</b></div>`;
        if (td.period) html += `<div style="color:#888;font-size:10px;margin-top:2px;">Periode: ${td.period}</div>`;
        if (td.unit) html += `<div style="color:#888;font-size:10px;">Enhet: ${td.unit}</div>`;
        html += `</div>`;
        return html;
      },
    },
    plotOptions: {
      series: { animation: { duration: 300 } },
      columnrange: {
        grouping: false,
        groupPadding: 0,
        pointPadding: 0.25,
        borderWidth: 0,
        borderRadius: 3,
      },
      scatter: {
        jitter: { x: 0, y: 0 },
        states: { hover: { enabled: true } },
      },
    },
    series: [...rangeSeries, ...refLineSeries, ...refDotSeries, ...diamondSeries],
    credits: { enabled: false },
    exporting: { enabled: false },
  };
}