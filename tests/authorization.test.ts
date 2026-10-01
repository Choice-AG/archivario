import { beforeEach, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const fake = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/server/firebase", () => ({
  adminAuth: () => ({
    verifyIdToken: async (token: string) => {
      if (token === "token-a") return { uid: "alice" };
      if (token === "token-b") return { uid: "bob" };
      if (token === "token-new") return { uid: "newbie" };
      if (token === "token-new-verified")
        return { uid: "newbie", email_verified: true };
      throw new Error("invalid");
    },
    getUser: async (uid: string) => ({
      metadata: {
        creationTime:
          uid === "newbie"
            ? "Mon, 01 Jan 2035 00:00:00 GMT"
            : "Thu, 01 Jan 2026 00:00:00 GMT",
      },
    }),
  }),
  db: () => (fake.current as { db: unknown }).db,
}));
vi.mock("@/server/lifecycle", () => ({
  isDeleting: async (uid: string) => storage().has("locks/" + uid),
  deletionRef: (uid: string) => ({ path: "locks/" + uid }),
}));
import { createFakeFirestore } from "./support/fake-firestore";
let firestore = createFakeFirestore();
fake.current = firestore;
const storage = () => firestore.store;
import { GET, POST } from "../src/app/api/library/route";
const request = (token: string, body?: unknown) =>
  new Request("http://localhost/api/library", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
beforeEach(() => {
  firestore = createFakeFirestore();
  fake.current = firestore;
});
it("rechaza llamadas sin identidad", async () => {
  expect((await GET(new Request("http://localhost/api/library"))).status).toBe(
    401,
  );
  expect((await GET(request("fake"))).status).toBe(401);
});
it("separa datos incluso usando Admin SDK", async () => {
  const response = await POST(
    request("token-a", {
      revision: 0,
      command: {
        type: "profile",
        profile: { name: "Alice privada", bio: "", timezone: "Europe/Madrid" },
      },
    }),
  );
  expect(response.status).toBe(200);
  expect((await (await GET(request("token-a"))).json()).profile.name).toBe(
    "Alice privada",
  );
  expect((await (await GET(request("token-b"))).json()).profile.name).toBe("");
  expect(storage().has("users/alice/private/library-v2")).toBe(true);
  expect([...storage().keys()].some((k) => k.startsWith("users/bob/"))).toBe(
    false,
  );
});
it("rechaza uid suministrado en el cuerpo", async () => {
  const r = await POST(
    request("token-b", {
      uid: "alice",
      revision: 0,
      command: {
        type: "profile",
        profile: { name: "Intruso", bio: "", timezone: "UTC" },
      },
    }),
  );
  expect(r.status).toBe(400);
});
it("impide sobreescrituras desde revisiones antiguas", async () => {
  const payload = {
    revision: 0,
    command: {
      type: "profile",
      profile: { name: "Alice", bio: "", timezone: "UTC" },
    },
  };
  expect((await POST(request("token-a", payload))).status).toBe(200);
  expect((await POST(request("token-a", payload))).status).toBe(409);
});
it("evita caché compartida", async () => {
  const r = await GET(request("token-a"));
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(r.headers.get("vary")).toBe("Authorization");
});

it("bloquea operaciones tras empezar a eliminar la cuenta", async () => {
  storage().set("locks/alice", { deleting: true });
  expect((await GET(request("token-a"))).status).toBe(409);
  expect((await GET(request("token-b"))).status).toBe(200);
});
it("mantiene las listas privadas y protege también la ficha de IGDB", async () => {
  const payload = {
    revision: 0,
    command: {
      type: "save-list",
      list: { id: "personal", name: "Privada", description: "", gameIds: [] },
    },
  };
  expect((await POST(request("token-a", payload))).status).toBe(200);
  expect((await (await GET(request("token-a"))).json()).lists).toHaveLength(1);
  expect((await (await GET(request("token-b"))).json()).lists ?? []).toEqual(
    [],
  );
  const { GET: details } = await import("../src/app/api/catalog/details/route");
  expect(
    (
      await details(
        new Request("http://localhost/api/catalog/details?id=14593"),
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await details(
        new Request("http://localhost/api/catalog/details?id=oops", {
          headers: { Authorization: "Bearer token-a" },
        }),
      )
    ).status,
  ).toBe(400);
});

it("exige correo confirmado a las cuentas nuevas para usar el catálogo", async () => {
  const { GET: details } = await import("../src/app/api/catalog/details/route");
  const call = (token: string) =>
    details(
      new Request("http://localhost/api/catalog/details?id=oops", {
        headers: { Authorization: "Bearer " + token },
      }),
    );
  expect((await call("token-new")).status).toBe(403);
  // Con el correo confirmado pasa la verificación y llega a validar el id.
  expect((await call("token-new-verified")).status).toBe(400);
  // Las cuentas antiguas siguen sin necesitar confirmación.
  expect((await call("token-a")).status).toBe(400);
});

it("responde sin datos cuando el cliente ya tiene la revisión actual", async () => {
  await POST(
    request("token-a", {
      revision: 0,
      command: {
        type: "profile",
        profile: { name: "Ana", bio: "", timezone: "UTC" },
      },
    }),
  );
  const same = await GET(
    new Request("http://localhost/api/library?since=1", {
      headers: { Authorization: "Bearer token-a" },
    }),
  );
  expect(await same.json()).toEqual({ unchanged: true, revision: 1 });
  const older = await GET(
    new Request("http://localhost/api/library?since=0", {
      headers: { Authorization: "Bearer token-a" },
    }),
  );
  expect((await older.json()).profile.name).toBe("Ana");
});
