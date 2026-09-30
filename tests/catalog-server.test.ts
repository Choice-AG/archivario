import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const store = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock("@/server/firebase", () => {
  const ref = (key: string) => ({
    key,
    get: async () => ({ exists: store.has(key), data: () => store.get(key) }),
    set: async (data: Record<string, unknown>) => void store.set(key, data),
  });
  return {
    db: () => ({
      collection: (name: string) => ({
        doc: (id: string) => ref(name + "/" + id),
      }),
      runTransaction: async (fn: (tx: unknown) => unknown) =>
        fn({
          getAll: async (...refs: { key: string }[]) =>
            refs.map((r) => ({
              exists: store.has(r.key),
              data: () => store.get(r.key),
            })),
          set: (r: { key: string }, data: Record<string, unknown>) =>
            store.set(r.key, data),
        }),
    }),
  };
});
vi.mock("@/server/lifecycle", () => ({
  deletionRef: (uid: string) => ({ key: "locks/" + uid }),
}));
import { catalogDetails, searchCatalog } from "../src/server/catalog";

const ok = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200 });
const tokenResponse = () => ok({ access_token: "t", expires_in: 3600 });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  store.clear();
  process.env.IGDB_CLIENT_ID = "id";
  process.env.IGDB_CLIENT_SECRET = "secret";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("sirve la caché sin gastar el límite y descarta image_id no válidos", async () => {
  fetchMock.mockImplementation(async (url: string) =>
    url.includes("twitch")
      ? tokenResponse()
      : ok([
          { id: 1, name: "Hades", cover: { image_id: "abc123" } },
          { id: 2, name: "Raro", cover: { image_id: "../x" } },
        ]),
  );
  const first = await searchCatalog("alice", "hades", 1);
  expect(first[0].cover).toBe(
    "https://images.igdb.com/igdb/image/upload/t_cover_big/abc123.jpg",
  );
  expect(first[1].cover).toBeUndefined();
  expect(store.get("catalogLimits/alice")?.count).toBe(1);
  expect(await searchCatalog("alice", "hades", 1)).toEqual(first);
  expect(store.get("catalogLimits/alice")?.count).toBe(1);
  const cacheDoc = [...store.entries()].find(([k]) =>
    k.startsWith("catalogCache/"),
  )![1];
  expect(cacheDoc.expireAt).toBeDefined();
});

it("aplica el límite por usuario solo a los fallos de caché", async () => {
  store.set("catalogLimits/alice", { start: Date.now(), count: 20 });
  await expect(searchCatalog("alice", "celeste", 1)).rejects.toMatchObject({
    status: 429,
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("aplica un límite global para todas las cuentas", async () => {
  store.set("catalogLimits/_global", { start: Date.now(), count: 150 });
  await expect(searchCatalog("bob", "celeste", 1)).rejects.toMatchObject({
    status: 429,
  });
});

it("renueva el token si IGDB responde 401 y valida la forma de la respuesta", async () => {
  let games = 0;
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes("twitch")) return tokenResponse();
    games++;
    return games === 1
      ? new Response("", { status: 401 })
      : ok({ unexpected: true });
  });
  await expect(catalogDetails("alice", 7)).rejects.toMatchObject({
    status: 502,
  });
  expect(games).toBe(2);
});
