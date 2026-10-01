import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/server/firebase", () => ({}));
vi.mock("@/server/lifecycle", () => ({}));
import { parseSteamProfile, steamLibrary } from "../src/server/steam";

const ok = (data: unknown) => new Response(JSON.stringify(data));
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  process.env.STEAM_API_KEY = "k";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("acepta SteamID64, nombre personalizado y URL de perfil", () => {
  expect(parseSteamProfile("76561197960287930")).toEqual({
    steamId: "76561197960287930",
  });
  expect(parseSteamProfile("https://steamcommunity.com/id/gabe/")).toEqual({
    vanity: "gabe",
  });
  expect(
    parseSteamProfile("https://steamcommunity.com/profiles/76561197960287930"),
  ).toEqual({ steamId: "76561197960287930" });
  expect(() => parseSteamProfile("https://evil.example/id/x")).toThrow();
  expect(() => parseSteamProfile("a b")).toThrow();
});

it("resuelve el nombre y devuelve los juegos ordenados por tiempo jugado", async () => {
  fetchMock.mockImplementation(async (url: URL) =>
    url.pathname.includes("ResolveVanityURL")
      ? ok({ response: { success: 1, steamid: "76561197960287930" } })
      : ok({
          response: {
            games: [
              { appid: 1, name: "Poco", playtime_forever: 5 },
              { appid: 2, name: "Mucho", playtime_forever: 900 },
            ],
          },
        }),
  );
  const games = await steamLibrary("gabe");
  expect(games.map((g) => g.name)).toEqual(["Mucho", "Poco"]);
  const owned = fetchMock.mock.calls[1][0] as URL;
  expect(owned.searchParams.get("steamid")).toBe("76561197960287930");
  expect(owned.hostname).toBe("api.steampowered.com");
});

it("explica que la lista es privada cuando Steam no devuelve juegos", async () => {
  fetchMock.mockResolvedValue(ok({ response: {} }));
  await expect(steamLibrary("76561197960287930")).rejects.toMatchObject({
    status: 403,
  });
});

it("sin clave de Steam responde que no está configurado", async () => {
  delete process.env.STEAM_API_KEY;
  await expect(steamLibrary("76561197960287930")).rejects.toMatchObject({
    status: 503,
  });
});
