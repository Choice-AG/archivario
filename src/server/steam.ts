import "server-only";
import { HttpError } from "./http";
import type { SteamGame } from "@/features/library/domain/import-sources";

// Acepta SteamID64, nombre personalizado o la URL del perfil.
export function parseSteamProfile(input: string) {
  const value = input.trim();
  const url = value.match(
    /^https?:\/\/steamcommunity\.com\/(id|profiles)\/([^/?#]+)\/?/i,
  );
  const candidate = url ? url[2] : value;
  if (/^\d{17}$/.test(candidate)) return { steamId: candidate };
  if (/^[A-Za-z0-9_-]{2,32}$/.test(candidate) && (!url || url[1] === "id"))
    return { vanity: candidate };
  throw new HttpError(
    400,
    "Escribe tu SteamID64, tu nombre de perfil o la URL de tu perfil de Steam.",
  );
}

async function steam<T>(path: string, params: Record<string, string>) {
  const key = process.env.STEAM_API_KEY;
  if (!key)
    throw new HttpError(503, "La importación desde Steam no está configurada.");
  const url = new URL("https://api.steampowered.com/" + path);
  for (const [k, v] of Object.entries({ ...params, key, format: "json" }))
    url.searchParams.set(k, v);
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok)
    throw new HttpError(502, "Steam no está disponible en este momento.");
  return (await res.json()) as T;
}

async function steamIdOf(input: string) {
  const profile = parseSteamProfile(input);
  if (profile.steamId) return profile.steamId;
  const resolved = await steam<{
    response: { success: number; steamid?: string };
  }>("ISteamUser/ResolveVanityURL/v1/", { vanityurl: profile.vanity! });
  if (resolved.response.success !== 1 || !resolved.response.steamid)
    throw new HttpError(404, "No encontramos ese perfil de Steam.");
  return resolved.response.steamid;
}

const WISHLIST_MAX = 500;

// La lista de deseos solo trae identificadores: los nombres se piden aparte.
export async function steamWishlist(input: string): Promise<SteamGame[]> {
  const steamId = await steamIdOf(input);
  const list = await steam<{ response: { items?: { appid: number }[] } }>(
    "IWishlistService/GetWishlist/v1/",
    { steamid: steamId },
  );
  const ids = (list.response.items ?? [])
    .map((i) => i.appid)
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .slice(0, WISHLIST_MAX);
  if (!ids.length)
    throw new HttpError(
      404,
      "Tu lista de deseos de Steam está vacía o es privada. Revisa la privacidad de tu perfil y vuelve a intentarlo.",
    );
  const games: SteamGame[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const page = await steam<{
      response: { store_items?: { appid: number; name?: string }[] };
    }>("IStoreBrowseService/GetItems/v1/", {
      input_json: JSON.stringify({
        ids: ids.slice(i, i + 100).map((appid) => ({ appid })),
        context: { language: "spanish", country_code: "ES" },
      }),
    });
    for (const item of page.response.store_items ?? [])
      if (item.name && ids.includes(item.appid))
        games.push({ appid: item.appid, name: item.name, minutes: 0 });
  }
  return games.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function steamLibrary(input: string): Promise<SteamGame[]> {
  const steamId = await steamIdOf(input);
  const owned = await steam<{
    response: {
      games?: { appid: number; name?: string; playtime_forever?: number }[];
    };
  }>("IPlayerService/GetOwnedGames/v1/", {
    steamid: steamId,
    include_appinfo: "1",
    include_played_free_games: "1",
  });
  const games = owned.response.games;
  if (!games)
    throw new HttpError(
      403,
      "Tu perfil o tu lista de juegos de Steam es privada. Hazla pública en la configuración de privacidad de Steam y vuelve a intentarlo.",
    );
  return games
    .filter((g) => Number.isSafeInteger(g.appid) && g.name)
    .map((g) => ({
      appid: g.appid,
      name: g.name!,
      minutes: g.playtime_forever ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
}
