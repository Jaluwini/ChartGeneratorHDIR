import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: "Mangler id" }, { status: 400 });
    }

    const charts = await base44.asServiceRole.entities.SavedChart.filter({ id });
    const chart = charts?.[0];

    if (!chart) {
      return Response.json({ error: "Graf ikke funnet" }, { status: 404 });
    }

    return Response.json({
      id: chart.id,
      title: chart.title,
      chart_type: chart.chart_type,
      api_source: chart.api_source,
      created_date: chart.created_date,
      hc_config: chart.hc_config,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});