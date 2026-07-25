const ANILIST_URL = "https://graphql.anilist.co";

const SEARCH_QUERY = `
query ($search: String, $type: MediaType) {
  Page(page: 1, perPage: 8) {
    media(search: $search, type: $type) {
      id
      title { romaji english native }
      coverImage { large }
      startDate { year month day }
    }
  }
}`;

function pad(n) {
  return String(n).padStart(2, "0");
}

function mapMedia(d) {
  const s = d.startDate;
  const releaseDate = s?.year ? `${s.year}-${pad(s.month || 1)}-${pad(s.day || 1)}` : "";
  return {
    externalId: d.id,
    title: d.title.english || d.title.romaji || d.title.native,
    cover: d.coverImage?.large || "",
    releaseDate,
  };
}

// AniList GraphQL API — public, no API key required. https://docs.anilist.co/
export async function searchAnilist(type, query) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { search: query, type: type === "anime" ? "ANIME" : "MANGA" },
    }),
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "AniList API error");
  return (json.data?.Page?.media || []).map(mapMedia);
}
