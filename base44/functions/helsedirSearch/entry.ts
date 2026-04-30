// Temporary helper to find indicator IDs by keyword
Deno.serve(async (req) => {
  const apiKey = Deno.env.get("HELSEDIR_API_KEY");
  const headers = {
    'Accept': 'application/json',
    ...(apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {})
  };
  const res = await fetch("https://api.helsedirektoratet.no/innhold/nki/kvalitetsindikatorer/", { headers });
  const arr = await res.json();
  const { keyword } = await req.json();
  const matches = arr.filter(i => i.tittel?.toLowerCase().includes(keyword.toLowerCase()));
  return Response.json(matches.map(i => ({ id: i.id, tittel: i.tittel, jsonUrl: i.attachments?.find(a => a.fileType === "application/json")?.fileUri })));
});