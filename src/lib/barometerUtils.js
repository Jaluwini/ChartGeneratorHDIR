function clean(v) {
  if (v === null || v === undefined || v === "" || v === "-") return null;
  const s = String(v).replace(/[\s\u00a0]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function getDiamondColor(relValue, config) {
  // relValue is already relative to reference (i.e. value - norge)
  if (relValue === null) return config.colorMissing || "#ffffff";
  const effectiveDiff = config.higherIsBetter !== false ? relValue : -relValue;

  if (config.colorMode === "relative") {
    // For relative mode we need original value and reference to compute pct — pass relValue directly as absolute diff
    const tGood = config.thresholdGood ?? 5;
    const tBad = config.thresholdBad ?? -5;
    if (effectiveDiff >= tGood) return config.colorGood || "#22c55e";
    if (effectiveDiff <= tBad) return config.colorBad || "#ef4444";
    return config.colorNeutral || "#f59e0b";
  }
  if (config.colorMode === "absolute") {
    const tGood = config.thresholdGood ?? 0;
    const tBad = config.thresholdBad ?? 0;
    if (effectiveDiff >= tGood) return config.colorGood || "#22c55e";
    if (effectiveDiff <= tBad) return config.colorBad || "#ef4444";
    return config.colorNeutral || "#f59e0b";
  }
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

  // Process rows — normalize all values relative to the reference (norge)
  // So that norge = 0, and the red reference line is always at x = 0
  const rows = data.map((row, i) => {
    const rawValue = clean(row[colValue]);
    const rawReference = colReference ? clean(row[colReference]) : null;
    const rawMin = colMin ? clean(row[colMin]) : null;
    const rawMax = colMax ? clean(row[colMax]) : null;
    const unit = colUnit ? (row[colUnit] || "") : (valueSuffix || "");
    const period = colPeriod ? (row[colPeriod] || "") : "";
    const theme = colTheme ? (row[colTheme] || "") : null;
    const indicatorLabel = String(row[colIndicator] || `Indikator ${i + 1}`);

    // Normalize: subtract the reference so norge = 0
    const ref = rawReference ?? referenceLineFixed ?? null;
    const relValue = rawValue !== null && ref !== null ? rawValue - ref : rawValue;
    const relMin = rawMin !== null && ref !== null ? rawMin - ref : null;
    const relMax = rawMax !== null && ref !== null ? rawMax - ref : null;

    let color;
    if (colorMode === "column" && colColor) {
      const raw = String(row[colColor] || "").toLowerCase();
      if (raw === "red" || raw === "rød") color = colorBad || "#ef4444";
      else if (raw === "green" || raw === "grønn") color = colorGood || "#22c55e";
      else if (raw === "yellow" || raw === "gul") color = colorNeutral || "#f59e0b";
      else color = colorMissing || "#ffffff";
    } else {
      color = getDiamondColor(relValue, config);
    }

    return {
      indicatorLabel,
      // Relative values (used for plotting)
      relValue, relMin, relMax,
      // Raw values (used in tooltip)
      rawValue, rawReference: ref, rawMin, rawMax,
      unit, period, theme, color, rowIndex: i
    };
  });

  const categories = rows.map(r => r.indicatorLabel);

  // Determine axis range from relative values
  const allRelValues = rows.flatMap(r => [r.relValue, r.relMin, r.relMax].filter(v => v !== null));
  // Always include 0 (the reference line position)
  allRelValues.push(0);
  const yMin = Math.min(...allRelValues);
  const yMax = Math.max(...allRelValues);
  const yPad = Math.max((yMax - yMin) * 0.12, 0.5);

  // Series 1: gray variation bars (columnrange) — relative to reference
  const hasRangeData = rows.some(r => r.relMin !== null && r.relMax !== null);
  const rangeSeries = hasRangeData && showReferenceBar !== false ? [{
    name: "Variasjon mellom fylkene",
    type: "columnrange",
    data: rows.map((r, xi) => {
      if (r.relMin === null || r.relMax === null) return null;
      return { x: xi, low: r.relMin, high: r.relMax, color: barColor || "#cccccc" };
    }),
    color: barColor || "#cccccc",
    grouping: false,
    groupPadding: 0,
    pointPadding: 0.2,
    borderWidth: 0,
    borderRadius: 2,
    enableMouseTracking: false,
    showInLegend: true,
    legendSymbol: "rectangle",
  }] : [];

  // Series 2: reference dot series when no range bars (shows norway position as a dot/diamond)
  const refDotSeries = (!hasRangeData && colReference) ? [{
    name: "Nasjonalt gjennomsnitt",
    type: "scatter",
    data: rows.map((r, xi) =>
      r.rawReference !== null ? { x: xi, y: 0 } : null
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
    if (r.relValue !== null) {
      grp.data.push({ x: xi, y: r.relValue, tooltipData: r });
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

  // Theme plotBands on xAxis
  const xPlotBands = [];
  const themeSegments = [];
  if (colTheme) {
    const themes = [];
    let currentTheme = null;
    let startIdx = 0;
    rows.forEach((r, i) => {
      if (r.theme !== currentTheme) {
        if (currentTheme !== null) {
          themes.push({ theme: currentTheme, from: startIdx - 0.5, to: i - 0.5 });
        }
        currentTheme = r.theme;
        startIdx = i;
      }
    });
    if (currentTheme !== null) {
      themes.push({ theme: currentTheme, from: startIdx - 0.5, to: rows.length - 0.5 });
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
          align: "left",
          verticalAlign: "middle",
          x: 6,
          rotation: 270,
          style: {
            fontSize: "8px",
            fontWeight: "700",
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            textOverflow: "ellipsis",
          },
        },
        zIndex: 1,
      });
    });
  }

  // The reference is always at y = 0 — draw a fixed plotLine there
  const refLineColor = referenceLineColor || "#cc0000";
  const yPlotLines = [{
    value: 0,
    color: refLineColor,
    width: 2,
    zIndex: 4,
  }];

  // If a fixed external reference line is set (not the norway line), draw it too
  if (referenceLineFixed !== null && referenceLineFixed !== undefined && referenceLineFixed !== "") {
    yPlotLines.push({
      value: parseFloat(referenceLineFixed),
      color: "#888",
      width: 1,
      dashStyle: "Dash",
      zIndex: 3,
      label: {
        text: "Fast ref.",
        align: "left",
        style: { color: "#888", fontSize: "10px" },
      },
    });
  }

  const marginRight = 60;

  const dec = decimals ?? 1;

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
    // yAxis is the horizontal value axis — now in relative units (diff from norway)
    yAxis: {
      min: yMin - yPad,
      max: yMax + yPad,
      title: { text: "" },
      gridLineWidth: 1,
      gridLineColor: "#e5e7eb",
      plotLines: yPlotLines,
      labels: {
        formatter: function () {
          const sign = this.value > 0 ? "+" : "";
          return sign + this.value.toFixed(dec) + (valueSuffix ? ` ${valueSuffix}` : "");
        },
        style: { fontSize: "10px" },
      },
      tickLength: 0,
    },
    legend: {
      enabled: true,
      align: "center",
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
        const suf = td.unit || valueSuffix || "";
        const fmt = (v) => v !== null && v !== undefined ? v.toFixed(dec) + (suf ? " " + suf : "") : "–";
        const fmtRel = (v) => v !== null && v !== undefined
          ? (v >= 0 ? "+" : "") + v.toFixed(dec) + (suf ? " " + suf : "")
          : "–";
        let html = `<div style="font-family:Inter,sans-serif;font-size:12px;max-width:260px;">`;
        html += `<div style="font-weight:600;margin-bottom:4px;">${td.indicatorLabel}</div>`;
        html += `<table style="border-spacing:0 2px;width:100%">`;
        if (td.rawValue !== null) html += `<tr><td style="color:#888;padding-right:8px">Fylke:</td><td><b>${fmt(td.rawValue)}</b></td></tr>`;
        if (td.rawReference !== null) html += `<tr><td style="color:#888;padding-right:8px">Norge:</td><td><b>${fmt(td.rawReference)}</b></td></tr>`;
        if (td.rawMin !== null && td.rawMax !== null) html += `<tr><td style="color:#888;padding-right:8px">Variasjon:</td><td><b>${fmt(td.rawMin)} – ${fmt(td.rawMax)}</b></td></tr>`;
        if (td.relValue !== null) html += `<tr><td style="color:#888;padding-right:8px">Diff. fra Norge:</td><td><b>${fmtRel(td.relValue)}</b></td></tr>`;
        if (td.period) html += `<tr><td style="color:#888;padding-right:8px;font-size:10px">Periode:</td><td style="font-size:10px">${td.period}</td></tr>`;
        html += `</table></div>`;
        return html;
      },
    },
    plotOptions: {
      series: { animation: { duration: 300 } },
      columnrange: {
        grouping: false,
        groupPadding: 0,
        pointPadding: 0.2,
        borderWidth: 0,
        borderRadius: 2,
      },
      scatter: {
        jitter: { x: 0, y: 0 },
        states: { hover: { enabled: true } },
      },
    },
    series: [...rangeSeries, ...refDotSeries, ...diamondSeries],
    credits: { enabled: false },
    exporting: { enabled: false },
  };
}