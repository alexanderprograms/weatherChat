// api/weather.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

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
    } catch (err) {
      console.error('Invalid JSON from wttr:', rawText.slice(0, 200));
      return res.status(502).json({ error: 'Weather API returned invalid JSON' });
    }

    const current = weatherData.current_condition?.[0];
    const area = weatherData.nearest_area?.[0];

    if (!current || !area) {
      return res.status(500).json({ error: 'Malformed weather data' });
    }

    const condition = current.weatherDesc?.[0]?.value || 'Unknown';

    const weather = {
      city: area.areaName?.[0]?.value,
      country: area.country?.[0]?.value,
      temperature_celsius: parseInt(current.temp_C),
      feels_like_celsius: parseInt(current.FeelsLikeC),
      condition,
      wind_speed_kmh: parseInt(current.windspeedKmph),
      precipitation_mm: parseFloat(current.precipMM),
      humidity_percent: parseInt(current.humidity)
    };

    // ── Step 2: Fetch matching Pexels image ────────────────
    let photoUrl = null;

    if (pexelsKey) {
      const c = condition.toLowerCase();
      let searchQuery = 'sky landscape';
      if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) searchQuery = 'rain storm city';
      else if (c.includes('snow') || c.includes('blizzard'))                    searchQuery = 'snow winter city';
      else if (c.includes('clear') || c.includes('sunny'))                      searchQuery = 'sunny blue sky city';
      else if (c.includes('fog') || c.includes('mist'))                         searchQuery = 'fog mist city';
      else if (c.includes('thunder') || c.includes('storm'))                    searchQuery = 'thunderstorm sky';
      else if (c.includes('overcast') || c.includes('cloudy'))                  searchQuery = 'cloudy sky city';

      const page = Math.floor(Math.random() * 5) + 1; // fix: define page

      const pexelsRes = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&orientation=landscape&per_page=10&page=${page}`,
        { headers: { Authorization: pexelsKey } }
      );

      if (pexelsRes.ok) {
        const pexelsData = await pexelsRes.json(); // fix: only parse once
        const photos = pexelsData.photos;
        if (photos?.length > 0) {
          const photo = photos[Math.floor(Math.random() * photos.length)];
          photoUrl = photo.src?.large2x || photo.src?.large || null;
        }
      } else {
        console.error('Pexels error:', pexelsRes.status);
      }
    }

    return res.status(200).json({ ...weather, photoUrl });

  } catch (err) {
    console.error('Weather API error:', err);
    return res.status(500).json({ error: err.message });
  }
}