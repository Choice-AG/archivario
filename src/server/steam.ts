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

export async function steamLibrary(input: string): Promise<SteamGame[]> {
  const profile = parseSteamProfile(input);
  let steamId = profile.steamId;
  if (!steamId) {
    const resolved = await steam<{
      response: { success: number; steamid?: string };
    }>("ISteamUser/ResolveVanityURL/v1/", { vanityurl: profile.vanity! });
    if (resolved.response.success !== 1 || !resolved.response.steamid)
      throw new HttpError(404, "No encontramos ese perfil de Steam.");
    steamId = resolved.response.steamid;
  }
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
