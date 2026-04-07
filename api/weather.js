// api/weather.js
// Uses wttr.in — simple, free, no API key, works from Vercel serverless functions

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city } = req.body;
  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  try {
    // wttr.in returns clean JSON with a single URL — no geocoding step needed
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'weather-agent/1.0' }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Weather service returned ${response.status}` });
    }

    const data = await response.json();

    const current = data.current_condition[0];
    const area = data.nearest_area[0];

    const cityName = area.areaName[0].value;
    const country = area.country[0].value;

    return res.status(200).json({
      city: cityName,
      country,
      temperature_celsius: parseInt(current.temp_C),
      feels_like_celsius: parseInt(current.FeelsLikeC),
      condition: current.weatherDesc[0].value,
      wind_speed_kmh: parseInt(current.windspeedKmph),
      precipitation_mm: parseFloat(current.precipMM),
      humidity_percent: parseInt(current.humidity)
    });

  } catch (err) {
    console.error('Weather API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
