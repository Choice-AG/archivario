// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { useLibrary } from "../src/features/library/presentation/use-library";
import { demoLibrary } from "../src/features/library/infrastructure/demo";
import {
  applyCommand,
  type Library,
} from "../src/features/library/domain/model";

const user = { uid: "alice", getIdToken: async () => "t" } as unknown as User;
let server: Library;
let online: boolean;
const json = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200 });
beforeEach(() => {
  localStorage.clear();
  server = { ...demoLibrary(), revision: 3 };
  online = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (!online) throw new TypeError("Failed to fetch");
      if (init?.method === "POST") {
        const { revision, command } = JSON.parse(String(init.body));
        if (revision !== server.revision)
          return new Response(JSON.stringify({ error: "conflicto" }), {
            status: 409,
          });
        server = applyCommand(server, command, new Date().toISOString());
      }
      return json(server);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const profile = (name: string) => ({
  type: "profile" as const,
  profile: { name, bio: "", timezone: "Europe/Madrid" },
});

it("guarda los cambios sin conexión y los envía al volver", async () => {
  const { result } = renderHook(() => useLibrary(user));
  await waitFor(() => expect(result.current.ready).toBe(true));
  online = false;
  await act(() => result.current.execute(profile("Sin red")));
  expect(result.current.state.profile.name).toBe("Sin red");
  expect(result.current.offline).toBe(true);
  expect(result.current.pendingSync).toBe(1);
  // Mientras tanto, otro dispositivo cambió la biblioteca.
  server = applyCommand(server, profile("Otro"), new Date().toISOString());
  online = true;
  await act(() => result.current.reload());
  expect(result.current.pendingSync).toBe(0);
  expect(result.current.offline).toBe(false);
  expect(server.profile.name).toBe("Sin red");
  expect(result.current.state.revision).toBe(server.revision);
});

it("abre la última copia guardada si arranca sin conexión", async () => {
  const first = renderHook(() => useLibrary(user));
  await waitFor(() => expect(first.result.current.ready).toBe(true));
  first.unmount();
  online = false;
  const { result } = renderHook(() => useLibrary(user));
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.state.games).toHaveLength(server.games.length);
  expect(result.current.error).toBe("");
});
