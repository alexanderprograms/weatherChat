// api/image-proxy.js
// Fetches an external image server-side and streams it back to the browser.
// This avoids CORS issues — the browser sees the image as coming from our own domain.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url query param required' });
  }

  // Only allow Unsplash image domains for security
  const allowed = ['images.unsplash.com', 'plus.unsplash.com'];
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!allowed.includes(hostname)) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const imageRes = await fetch(url);

    if (!imageRes.ok) {
      return res.status(502).json({ error: `Image fetch failed: ${imageRes.status}` });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imageRes.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache for 1 hour
    return res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    console.error('Image proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
