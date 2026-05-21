export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q');
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!query) {
    return Response.json({ error: 'Missing query' }, { status: 400 });
  }

  if (!API_KEY) {
    return Response.json({ error: 'Missing API key' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,photos&key=${API_KEY}`
    );

    const data = await res.json();

    const results = (data.candidates || []).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      images: place.photos?.slice(0, 5).map(
        (p: any) => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${p.photo_reference}&key=${API_KEY}`
      ) || []
    }));

    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}