// api/weather.js
// Fetches weather data server-side — avoids CORS issues with Open-Meteo

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city } = req.body;
  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  try {
    // Step 1: Geocode city name to lat/lng
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: `Could not find location: ${city}` });
    }

    const place = geoData.results[0];
    const { latitude, longitude, name: placeName, country } = place;

    // Step 2: Fetch current weather
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,precipitation&timezone=auto`
    );
    const weatherData = await weatherRes.json();
    const current = weatherData.current;

    const codes = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 48: "Icy fog",
      51: "Light drizzle", 53: "Moderate drizzle", 55: "Heavy drizzle",
      61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
      71: "Light snow", 73: "Moderate snow", 75: "Heavy snow",
      80: "Light showers", 81: "Moderate showers", 82: "Heavy showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail"
    };

    return res.status(200).json({
      city: placeName,
      country,
      temperature_celsius: current.temperature_2m,
      feels_like_celsius: current.apparent_temperature,
      condition: codes[current.weathercode] || `Code ${current.weathercode}`,
      wind_speed_kmh: current.windspeed_10m,
      precipitation_mm: current.precipitation
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
