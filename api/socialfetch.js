// Server-side proxy for the free tools. Keeps the Social Fetch API key off the client.
// Deploys as-is on Vercel (Node runtime). Set SOCIALFETCH_API_KEY in the project's env vars.
// Until the key is set it answers 503 { error: { code: 'not_configured' } } and the tools show preview data.

const ALLOWED = /^\/v1\/(instagram|tiktok)\/profiles\/[A-Za-z0-9._%-]{1,100}(\/engagement)?$/;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: { code: 'method_not_allowed' } });

  const path = String(req.query.path || '');
  if (!ALLOWED.test(path)) return res.status(400).json({ error: { code: 'bad_request' } });

  const key = process.env.SOCIALFETCH_API_KEY;
  if (!key) return res.status(503).json({ error: { code: 'not_configured' } });

  try {
    const upstream = await fetch(`https://api.socialfetch.dev${path}`, { headers: { 'x-api-key': key } });
    const body = await upstream.text();
    res.setHeader('content-type', 'application/json');
    // cache successful lookups at the edge for an hour so repeat searches don't spend credits
    if (upstream.ok) res.setHeader('cache-control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ error: { code: 'upstream_unreachable' } });
  }
}
