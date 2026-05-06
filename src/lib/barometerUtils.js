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
  // default: relative %
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
    colorMode, higherIsBetter,
    thresholdGood, thresholdBad,
    colorGood, colorNeutral, colorBad, colorMissing,
    barColor, referenceLineColor, diamondSize,
    title, subtitle, decimals, valueSuffix,
    showReferenceBar, referenceLineFixed,
    height
  } = config;

  if (!data || data.length === 0 || !colIndicator || !colValue) return null;

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

  // Build categories (reversed so first row is at top)
  const categories = rows.map(r => r.indicatorLabel).reverse();
  const reversed = [...rows].reverse();

  // Series 1: gray variation bars (columnrange)
  const hasRangeData = reversed.some(r => r.minVal !== null && r.maxVal !== null);
  const rangeSeries = hasRangeData && showReferenceBar !== false ? [{
    name: "Variasjon mellom fylkene",
    type: "columnrange",
    data: reversed.map(r => {
      if (r.minVal === null || r.maxVal === null) return null;
      return {
        low: r.minVal,
        high: r.maxVal,
        color: barColor || "#cccccc",
      };
    }),
    color: barColor || "#cccccc",
    groupPadding: 0,
    pointPadding: 0.2,
    borderWidth: 0,
    enableMouseTracking: false,
    showInLegend: true,
    legendSymbol: "rectangle",
  }] : [];

  // Series 2: national reference dots (if no min/max but reference column exists)
  const refDotSeries = (!hasRangeData && colReference) ? [{
    name: "Nasjonalt gjennomsnitt",
    type: "scatter",
    data: reversed.map(r => r.reference !== null ? { x: r.reference, y: 0 } : null),
    marker: { symbol: "diamond", radius: (diamondSize || 8) * 0.8, lineWidth: 1.5, lineColor: "#555", fillColor: "#fff" },
    showInLegend: true,
    enableMouseTracking: false,
  }] : [];

  // Series 3: main value diamonds (scatter)
  // Group by color so we can have separate legend entries
  const colorGroups = {
    [colorGood || "#22c55e"]: { name: "Bedre enn referanse", color: colorGood || "#22c55e", data: [] },
    [colorNeutral || "#f59e0b"]: { name: "På nivå med referanse", color: colorNeutral || "#f59e0b", data: [] },
    [colorBad || "#ef4444"]: { name: "Dårligere enn referanse", color: colorBad || "#ef4444", data: [] },
    [colorMissing || "#ffffff"]: { name: "Manglende data", color: colorMissing || "#ffffff", data: [] },
  };

  reversed.forEach((r, yi) => {
    if (r.value === null) {
      colorGroups[colorMissing || "#ffffff"].data.push({
        x: null, y: yi,
        tooltipData: r,
      });
      return;
    }
    const grp = colorGroups[r.color] || colorGroups[colorGood || "#22c55e"];
    grp.data.push({ x: r.value, y: yi, tooltipData: r });
  });

  const diamondSeries = Object.values(colorGroups)
    .filter(g => g.data.some(d => d.x !== null))
    .map(g => ({
      name: g.name,
      type: "scatter",
      data: g.data.map(d => d.x !== null ? {
        x: d.x,
        y: d.y,
        tooltipData: d.tooltipData,
      } : null),
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

  // Build theme band plotBands on yAxis
  const plotBands = [];
  if (colTheme) {
    const themes = [];
    let currentTheme = null;
    let startIdx = 0;
    reversed.forEach((r, i) => {
      if (r.theme !== currentTheme) {
        if (currentTheme !== null) {
          themes.push({ theme: currentTheme, from: startIdx - 0.5, to: i - 0.5 });
        }
        currentTheme = r.theme;
        startIdx = i;
      }
    });
    if (currentTheme !== null) {
      themes.push({ theme: currentTheme, from: startIdx - 0.5, to: reversed.length - 0.5 });
    }
    const bandColors = ["#f8f9fa", "#ffffff"];
    themes.forEach((t, i) => {
      plotBands.push({
        from: t.from,
        to: t.to,
        color: bandColors[i % 2],
        label: {
          text: t.theme,
          align: "left",
          x: 5,
          style: { fontSize: "9px", color: "#888", fontWeight: "600", textTransform: "uppercase" },
          verticalAlign: "middle",
        },
        zIndex: 0,
      });
    });
  }

  // Build plotLines (reference value per row OR fixed global line)
  const xPlotLines = [];
  if (referenceLineFixed !== null && referenceLineFixed !== undefined && referenceLineFixed !== "") {
    xPlotLines.push({
      value: parseFloat(referenceLineFixed),
      color: referenceLineColor || "#cc0000",
      width: 2,
      zIndex: 4,
      label: { text: "Ref.", align: "left", style: { color: referenceLineColor || "#cc0000", fontSize: "10px" } }
    });
  }

  // Determine x-axis range
  const allXValues = rows.flatMap(r => [r.value, r.minVal, r.maxVal, r.reference].filter(v => v !== null));
  const xMin = allXValues.length > 0 ? Math.min(...allXValues) : 0;
  const xMax = allXValues.length > 0 ? Math.max(...allXValues) : 100;
  const xPad = (xMax - xMin) * 0.1;

  const hcConfig = {
    chart: {
      type: "scatter",
      inverted: true,
      height: height || Math.max(400, rows.length * 28 + 120),
      marginLeft: 280,
      marginRight: 60,
      style: { fontFamily: "Inter, sans-serif" },
    },
    title: { text: title || "", style: { fontSize: "15px", fontWeight: "600" } },
    subtitle: { text: subtitle || "" },
    xAxis: {
      min: xMin - xPad,
      max: xMax + xPad,
      gridLineWidth: 1,
      gridLineColor: "#e5e7eb",
      plotLines: xPlotLines,
      labels: {
        formatter: function() {
          return this.value.toFixed(decimals ?? 1) + (valueSuffix ? ` ${valueSuffix}` : "");
        },
        style: { fontSize: "10px" }
      },
      title: { text: "" },
      tickLength: 0,
    },
    yAxis: {
      categories,
      title: { text: "" },
      gridLineWidth: 1,
      gridLineColor: "#e5e7eb",
      plotBands,
      labels: {
        style: { fontSize: "11px", color: "#374151" },
        align: "right",
      },
      lineWidth: 0,
      tickLength: 0,
      reversed: false,
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
      formatter: function() {
        const pt = this.point;
        const td = pt.tooltipData;
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
      }
    },
    plotOptions: {
      series: { animation: { duration: 300 } },
      columnrange: {
        inverted: true,
        grouping: false,
        groupPadding: 0,
        pointPadding: 0.25,
        borderWidth: 0,
        borderRadius: 3,
      },
      scatter: {
        jitter: { x: 0, y: 0 },
        states: { hover: { enabled: true } }
      }
    },
    series: [...rangeSeries, ...refDotSeries, ...diamondSeries],
    credits: { enabled: false },
    exporting: { enabled: false },
  };

  return hcConfig;
}