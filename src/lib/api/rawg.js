const RAWG_BASE = "https://api.rawg.io/api";
const RAWG_KEY = import.meta.env.VITE_RAWG_API_KEY;

function mapGame(d) {
  return {
    externalId: d.id,
    title: d.name,
    cover: d.background_image || "",
    releaseDate: d.released || "",
    platform: (d.platforms || []).map((p) => p.platform.name).join(", "),
  };
}

// RAWG Video Games Database API — requires an API key (free tier), see https://rawg.io/apidocs
export async function searchRawg(query) {
  if (!RAWG_KEY) throw new Error("Falta VITE_RAWG_API_KEY en el archivo .env");
  const url = `${RAWG_BASE}/games?key=${RAWG_KEY}&search=${encodeURIComponent(query)}&page_size=8`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RAWG API error: ${res.status}`);
  const json = await res.json();
  return (json.results || []).map(mapGame);
}
