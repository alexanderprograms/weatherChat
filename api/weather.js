// api/weather.js
// Fetches weather from wttr.in and a matching photo from Pexels

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city } = req.body;
  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  const pexelsKey = process.env.PEXELS_API_KEY;

  try {
    // ── Step 1: Fetch weather ──────────────────────────────
    const weatherRes = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { headers: { 'User-Agent': 'weather-agent/1.0' } }
    );

    if (!weatherRes.ok) {
      return res.status(502).json({ error: `Weather service returned ${weatherRes.status}` });
    }

    const rawText = await weatherRes.text();

let weatherData;
try {
  weatherData = JSON.parse(rawText);
} catch (e) {
  console.error("Invalid JSON from wttr:", rawText.slice(0, 200));
  return res.status(502).json({ error: "Weather API returned invalid JSON" });
}
    const current = weatherData.current_condition[0];
    const area = weatherData.nearest_area[0];

    const condition = current.weatherDesc[0].value;

    const weather = {
      city: area.areaName[0].value,
      country: area.country[0].value,
      temperature_celsius: parseInt(current.temp_C),
      feels_like_celsius: parseInt(current.FeelsLikeC),
      condition,
      wind_speed_kmh: parseInt(current.windspeedKmph),
      precipitation_mm: parseFloat(current.precipMM),
      humidity_percent: parseInt(current.humidity)
    };

    // ── Step 2: Fetch a matching Pexels photo ──────────────
    let photoUrl = null;

    if (pexelsKey) {
      const c = condition.toLowerCase();
      let searchQuery = 'sky landscape';
      if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) searchQuery = 'rain storm';
      else if (c.includes('snow') || c.includes('blizzard'))                    searchQuery = 'snow winter';
      else if (c.includes('clear') || c.includes('sunny'))                      searchQuery = 'sunny blue sky';
      else if (c.includes('fog') || c.includes('mist'))                         searchQuery = 'fog mist';
      else if (c.includes('thunder') || c.includes('storm'))                    searchQuery = 'thunderstorm';
      else if (c.includes('overcast') || c.includes('cloudy'))                  searchQuery = 'cloudy sky';

      const page = Math.floor(Math.random() * 5) + 1; // random page for variety
      const pexelsRes = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&orientation=landscape&per_page=10&page=${page}`,
        { headers: { Authorization: pexelsKey } }
      );

      if (pexelsRes.ok) {
        const pexelsData = await pexelsRes.json();
        const photos = pexelsData.photos;
        if (photos && photos.length > 0) {
          const photo = photos[Math.floor(Math.random() * photos.length)];
          // Use 'large2x' for a high quality landscape image
          photoUrl = photo.src?.large2x || photo.src?.large || null;
        }
      }
    }

    // Set CORS headers so the browser can load the image directly
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ ...weather, photoUrl });

  } catch (err) {
    console.error('Weather API error:', err);
    return res.status(500).json({ error: err.message });
  }
}