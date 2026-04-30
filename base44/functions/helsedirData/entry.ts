const BASE_URL = "https://api.helsedirektoratet.no/innhold/nki/kvalitetsindikatorer/";
const NO_DATA_SENTINEL = -1e7;

function parseYear(isoStr) {
  if (!isoStr) return null;
  return isoStr.slice(0, 4);
}

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("HELSEDIR_API_KEY");
    const headers = {
      'Accept': 'application/json',
      ...(apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {})
    };

    const body = await req.json();
    const action = body.action;

    // ACTION: list — return only id, tittel, jsonUrl
    if (action === "list") {
      const res = await fetch(BASE_URL, { headers });
      if (!res.ok) return Response.json({ error: `API feil: ${res.status}` }, { status: res.status });
      const arr = await res.json();
      const items = arr
        .filter(item => item.tittel && item.attachments?.some(a => a.fileType === "application/json"))
        .map(item => ({
          id: item.id,
          tittel: item.tittel,
          jsonUrl: item.attachments.find(a => a.fileType === "application/json").fileUri,
        }))
        .sort((a, b) => a.tittel.localeCompare(b.tittel, "no"));
      return Response.json({ indicators: items });
    }

    // ACTION: fetchData — fetch rows and return available filter options + filtered rows
    if (action === "fetchData") {
      const { jsonUrl, measureType, enhetType } = body;
      if (!jsonUrl) return Response.json({ error: "Mangler jsonUrl" }, { status: 400 });

      const res = await fetch(jsonUrl, { headers });
      if (!res.ok) return Response.json({ error: `API feil: ${res.status}` }, { status: res.status });
      const payload = await res.json();

      const rawRows = payload?.AttachmentDataRows;
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        return Response.json({ error: "Ingen data funnet for denne indikatoren." }, { status: 404 });
      }

      // Filter out sentinel values
      const validRows = rawRows.filter(row => {
        const v = parseFloat(row.Value);
        return !isNaN(v) && Math.abs(v - NO_DATA_SENTINEL) > 1;
      });

      if (validRows.length === 0) {
        return Response.json({ error: "Alle datapunkter mangler verdi for denne indikatoren." }, { status: 404 });
      }

      // Collect available filter options
      const measureTypes = [...new Set(validRows.map(r => r.MeasureType).filter(Boolean))];

      // Determine LocationType from LocationParentId: 
      // LocationParentId=0 → Nasjonalt, LocationParentId=1 → RHF, else → Sykehus/enhet
      const enhetTypes = [];
      const hasNational = validRows.some(r => !r.LocationParentId || r.LocationParentId === 0);
      const hasRHF = validRows.some(r => r.LocationParentId === 1);
      const hasSykehus = validRows.some(r => r.LocationParentId > 1);
      if (hasNational) enhetTypes.push("Nasjonalt");
      if (hasRHF) enhetTypes.push("RHF");
      if (hasSykehus) enhetTypes.push("Sykehus");

      // Apply filters (use defaults if not provided)
      const selectedMeasureType = measureType || measureTypes[0];
      const selectedEnhetType = enhetType || (hasNational ? "Nasjonalt" : hasSykehus ? "Sykehus" : "RHF");

      let filtered = validRows.filter(r => r.MeasureType === selectedMeasureType);

      if (selectedEnhetType === "Nasjonalt") {
        filtered = filtered.filter(r => !r.LocationParentId || r.LocationParentId === 0);
      } else if (selectedEnhetType === "RHF") {
        filtered = filtered.filter(r => r.LocationParentId === 1);
      } else {
        filtered = filtered.filter(r => r.LocationParentId > 1);
      }

      // Map to clean rows
      const rows = filtered.map(row => ({
        År: parseYear(row.TimeFrom),
        Enhet: row.LocationName || "",
        Overordnet: row.ParentName || "",
        Verdi: parseFloat(parseFloat(row.Value).toFixed(4)),
        Måletype: row.MeasureType || "",
      }));

      return Response.json({
        rows,
        filterOptions: { measureTypes, enhetTypes },
        selectedFilters: { measureType: selectedMeasureType, enhetType: selectedEnhetType }
      });
    }

    return Response.json({ error: "Ukjent action" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});