import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { url, headers: extraHeaders } = await req.json();

    if (!url) {
      return Response.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const apiKey = Deno.env.get("HELSEDIR_API_KEY");

    const fetchHeaders = {
      'Accept': 'application/json',
      ...(apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {}),
      ...(extraHeaders || {})
    };

    let response;
    try {
      response = await fetch(url, { headers: fetchHeaders });
    } catch (e) {
      return Response.json({ error: `Network error: ${e.message}` }, { status: 502 });
    }

    if (response.status === 401) {
      return Response.json({ error: 'API returned 401 Unauthorized. Check your API key.' }, { status: 401 });
    }
    if (response.status === 403) {
      return Response.json({ error: 'API returned 403 Forbidden. You may not have access to this endpoint.' }, { status: 403 });
    }
    if (!response.ok) {
      return Response.json({ error: `API returned status ${response.status}` }, { status: response.status });
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return Response.json({ error: 'API returned an empty response.' }, { status: 204 });
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return Response.json({ error: 'Response is not valid JSON.', raw: text.slice(0, 500) }, { status: 422 });
    }

    return Response.json({ data: json });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});