export default async function handler(req, res) {
  const pexelsKey = process.env.PEXELS_API_KEY;
  
  const response = await fetch(
    'https://api.pexels.com/v1/search?query=sunny+sky&orientation=landscape&per_page=3&page=1',
    { headers: { Authorization: pexelsKey } }
  );

  const text = await response.text();
  
  return res.status(200).json({
    pexelsStatus: response.status,
    keyPresent: !!pexelsKey,
    keyPrefix: pexelsKey?.slice(0, 8),
    response: text.slice(0, 1000)
  });
}