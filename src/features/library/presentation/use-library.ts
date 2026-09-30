"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  applyCommand,
  emptyLibrary,
  type Command,
  type Library,
} from "../domain/model";
import { commandSchema, librarySchema } from "../application/validation";
import { demoLibrary } from "../infrastructure/demo";
const key = "archivario-demo-v1";
// Compatibility with local demo data saved before the application was renamed.
const legacyKey = "partida-demo-v1";
export function useLibrary(user: User | null) {
  const [state, setState] = useState<Library>(emptyLibrary),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [undoEntry, setUndoEntry] = useState<{
    before: Library;
    revision: number;
  }>();
  const current = useRef(state),
    locked = useRef(false),
    mounted = useRef(true);
  const update = useCallback((s: Library) => {
    if (mounted.current) {
      current.current = s;
      setState(s);
    }
  }, []);
  const request = useCallback(
    async (url: string, init: RequestInit = {}) => {
      if (!user) throw new Error("Esta función necesita una cuenta conectada.");
      const token = await user.getIdToken();
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: { ...init.headers, Authorization: "Bearer " + token },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "No se ha podido conectar.");
      }
      return response;
    },
    [user],
  );
  const reload = useCallback(async () => {
    if (locked.current) return;
    const s = await (await request("/api/library")).json();
    if (!locked.current && s.revision >= current.current.revision) update(s);
  }, [request, update]);
  useEffect(() => {
    mounted.current = true;
    if (user)
      reload()
        .then(() => setReady(true))
        .catch((e) => {
          setError(e.message);
          setReady(true);
        });
    else {
      try {
        const saved =
          localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
        const initial = saved
          ? librarySchema.parse(JSON.parse(saved))
          : demoLibrary();
        if (saved) {
          localStorage.setItem(key, JSON.stringify(initial));
          localStorage.removeItem(legacyKey);
        }
        update(initial);
      } catch {
        update(demoLibrary());
        setError(
          "La demostración guardada no era válida; se han cargado los ejemplos.",
        );
      }
      setReady(true);
    }
    const focus = () => {
      if (user) reload().catch((e) => setError(e.message));
    };
    window.addEventListener("focus", focus);
    const timer = user ? window.setInterval(focus, 30000) : undefined;
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", focus);
      clearInterval(timer);
    };
  }, [user, reload, update]);
  async function execute(command: Command) {
    if (locked.current) throw new Error("Espera a que termine el guardado.");
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const before = structuredClone(current.current);
      const valid = commandSchema.parse(command);
      if (user) {
        const response = await request("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision: current.current.revision,
            command: valid,
          }),
        });
        update(await response.json());
      } else {
        const next = applyCommand(
          current.current,
          valid,
          new Date().toISOString(),
        );
        localStorage.setItem(key, JSON.stringify(next));
        update(next);
      }
      setUndoEntry(
        command.type === "import"
          ? undefined
          : { before, revision: current.current.revision },
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No se ha podido guardar.";
      setError(message);
      throw e;
    } finally {
      locked.current = false;
      setBusy(false);
      if (user) reload().catch(() => {});
    }
  }
  async function undo() {
    if (!undoEntry || locked.current) return;
    if (current.current.revision !== undoEntry.revision) {
      setUndoEntry(undefined);
      setError(
        "La biblioteca ha cambiado. No se puede deshacer sin sobrescribir cambios recientes.",
      );
      return;
    }
    await execute({
      type: "import",
      policy: "replace",
      data: undoEntry.before,
    });
  }
  return {
    state,
    ready,
    busy,
    error,
    setError,
    execute,
    request,
    reload,
    undo,
    canUndo: !!undoEntry && undoEntry.revision === state.revision,
  };
}
