import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/server/firebase", () => ({}));
vi.mock("@/server/lifecycle", () => ({}));
import {
  parseSteamProfile,
  steamLibrary,
  steamWishlist,
} from "../src/server/steam";
import {
  candidatesFromSteam,
  steamUpdates,
} from "../src/features/library/domain/import-sources";
import { emptyLibrary } from "../src/features/library/domain/model";

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

it("trae la lista de deseos con sus nombres", async () => {
  fetchMock.mockImplementation(async (url: URL) =>
    url.pathname.includes("GetWishlist")
      ? ok({ response: { items: [{ appid: 20 }, { appid: 10 }] } })
      : ok({
          response: {
            store_items: [
              { appid: 20, name: "Zeta" },
              { appid: 10, name: "Alfa" },
              { appid: 99, name: "Ajeno" },
            ],
          },
        }),
  );
  const games = await steamWishlist("76561197960287930");
  expect(games).toEqual([
    { appid: 10, name: "Alfa", minutes: 0 },
    { appid: 20, name: "Zeta", minutes: 0 },
  ]);
  const names = fetchMock.mock.calls[1][0] as URL;
  expect(JSON.parse(names.searchParams.get("input_json")!).ids).toEqual([
    { appid: 20 },
    { appid: 10 },
  ]);
});

it("explica que la lista de deseos está vacía o es privada", async () => {
  fetchMock.mockResolvedValue(ok({ response: {} }));
  await expect(steamWishlist("76561197960287930")).rejects.toMatchObject({
    status: 404,
  });
});

it("detecta los juegos cuyo tiempo en Steam ha cambiado", () => {
  const s = emptyLibrary();
  const base = {
    genres: [],
    platforms: ["PC"],
    favorite: false,
    next: false,
    review: "",
    spoilerNote: "",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  s.games = [
    {
      ...base,
      id: "a",
      title: "Portal 2",
      stores: ["Steam"],
      primaryRunId: "ra",
    },
    {
      ...base,
      id: "b",
      title: "Otro nombre",
      stores: [],
      primaryRunId: "rb",
      steam: { appId: 7, minutes: 60 },
    },
    { ...base, id: "c", title: "Hades", stores: ["GOG"], primaryRunId: "rc" },
  ];
  const games = [
    { appid: 620, name: "PORTAL 2", minutes: 300 },
    { appid: 7, name: "Renombrado", minutes: 60 },
    { appid: 8, name: "Hades", minutes: 40 },
  ];
  expect(steamUpdates(s, games)).toEqual([
    { gameId: "a", appId: 620, minutes: 300 },
  ]);
  expect(candidatesFromSteam(games, true)[0]).toMatchObject({
    wishlist: true,
    steam: { appId: 620, minutes: 300 },
  });
});
