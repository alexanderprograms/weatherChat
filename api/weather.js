// api/weather.js
// Fetches weather from wttr.in and a matching photo from Unsplash — all server-side

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city } = req.body;
  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  try {
    // ── Step 1: Fetch weather ──────────────────────────────
    const weatherRes = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { headers: { 'User-Agent': 'weather-agent/1.0' } }
    );

    if (!weatherRes.ok) {
      return res.status(502).json({ error: `Weather service returned ${weatherRes.status}` });
    }

    const weatherData = await weatherRes.json();
    const current = weatherData.current_condition[0];
    const area = weatherData.nearest_area[0];

    const condition = current.weatherDesc[0].value;
    const cityName = area.areaName[0].value;
    const country = area.country[0].value;

    const weather = {
      city: cityName,
      country,
      temperature_celsius: parseInt(current.temp_C),
      feels_like_celsius: parseInt(current.FeelsLikeC),
      condition,
      wind_speed_kmh: parseInt(current.windspeedKmph),
      precipitation_mm: parseFloat(current.precipMM),
      humidity_percent: parseInt(current.humidity)
    };

    // ── Step 2: Fetch a matching Unsplash photo ────────────
    // Build a search query from the weather condition
    const c = condition.toLowerCase();
    let searchQuery = 'sky clouds landscape';
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) searchQuery = 'rain storm weather';
    else if (c.includes('snow') || c.includes('blizzard'))                    searchQuery = 'snow winter landscape';
    else if (c.includes('clear') || c.includes('sunny'))                      searchQuery = 'sunny blue sky';
    else if (c.includes('fog') || c.includes('mist'))                         searchQuery = 'fog mist landscape';
    else if (c.includes('thunder') || c.includes('storm'))                    searchQuery = 'thunderstorm lightning';
    else if (c.includes('overcast') || c.includes('cloudy'))                  searchQuery = 'overcast cloudy sky';

    let photoUrl = null;

    if (unsplashKey) {
      const unsplashRes = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(searchQuery)}&orientation=landscape&content_filter=high`,
        { headers: { Authorization: `Client-ID ${unsplashKey}` } }
      );

      if (unsplashRes.ok) {
        const photo = await unsplashRes.json();
        // Use the regular size — good quality, not too large
        photoUrl = photo.urls?.regular || null;
      }
    }

    return res.status(200).json({ ...weather, photoUrl });

  } catch (err) {
    console.error('Weather API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
