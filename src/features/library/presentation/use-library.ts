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
import {
  loadCachedLibrary,
  loadQueue,
  OfflineError,
  saveCachedLibrary,
  saveQueue,
} from "./offline-store";
const key = "archivario-demo-v1";
// Compatibility with local demo data saved before the application was renamed.
const legacyKey = "partida-demo-v1";
export function useLibrary(user: User | null) {
  const [state, setState] = useState<Library>(emptyLibrary),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [offline, setOffline] = useState(false),
    [pendingSync, setPendingSync] = useState(() =>
      user ? loadQueue(user.uid).length : 0,
    );
  const [undoEntry, setUndoEntry] = useState<{
    before: Library;
    revision: number;
  }>();
  const current = useRef(state),
    locked = useRef(false),
    mounted = useRef(true),
    loadedOnce = useRef(false);
  const uid = user?.uid;
  const update = useCallback(
    (s: Library) => {
      if (mounted.current) {
        current.current = s;
        setState(s);
      }
      if (uid) saveCachedLibrary(uid, s);
    },
    [uid],
  );
  const request = useCallback(
    async (url: string, init: RequestInit = {}) => {
      if (!user) throw new Error("Esta función necesita una cuenta conectada.");
      let response: Response;
      try {
        const token = await user.getIdToken();
        response = await fetch(url, {
          ...init,
          cache: "no-store",
          headers: { ...init.headers, Authorization: "Bearer " + token },
        });
      } catch (e) {
        // fetch solo lanza TypeError cuando no hay red; el resto se propaga.
        if (
          e instanceof TypeError ||
          (e as { code?: string }).code === "auth/network-request-failed" ||
          !navigator.onLine
        )
          throw new OfflineError();
        throw e;
      }
      if (!response.ok) {
        // Un 502 de la plataforma puede devolver HTML en lugar de JSON.
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "No se ha podido conectar.");
      }
      return response;
    },
    [user],
  );
  const post = useCallback(
    async (revision: number, command: Command) =>
      (await (
        await request("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision, command }),
        })
      ).json()) as Library,
    [request],
  );
  // Envía en orden los cambios hechos sin conexión. Cada uno se aplica sobre
  // el estado actual del servidor; si otro dispositivo cambió algo entre
  // medias, se vuelve a aplicar sobre la versión nueva.
  const flush = useCallback(async () => {
    if (!uid || locked.current) return;
    const queue = loadQueue(uid);
    if (!queue.length) return;
    locked.current = true;
    const dropped: string[] = [];
    try {
      let server = (await (await request("/api/library")).json()) as Library;
      while (queue.length) {
        const command = queue[0];
        try {
          server = await post(server.revision, command);
        } catch (e) {
          if (e instanceof OfflineError) throw e;
          const latest = (await (
            await request("/api/library")
          ).json()) as Library;
          try {
            server = await post(latest.revision, command);
          } catch (again) {
            if (again instanceof OfflineError) throw again;
            // El cambio ya no encaja (por ejemplo, el juego se borró en otro
            // dispositivo): se descarta y se avisa.
            dropped.push((again as Error).message);
            server = latest;
          }
        }
        queue.shift();
        saveQueue(uid, queue);
        setPendingSync(queue.length);
      }
      update(server);
      setOffline(false);
      setError(
        dropped.length
          ? "Algunos cambios hechos sin conexión no se pudieron aplicar: " +
              dropped.join(" ")
          : "",
      );
    } catch (e) {
      if (!(e instanceof OfflineError)) setError((e as Error).message);
      else setOffline(true);
    } finally {
      locked.current = false;
    }
  }, [uid, request, post, update]);
  const reload = useCallback(async () => {
    if (locked.current) return;
    if (uid && loadQueue(uid).length) return flush();
    try {
      // Tras la primera carga solo se pide la biblioteca si ha cambiado.
      const known = current.current.revision;
      const s = await (
        await request(
          "/api/library" + (loadedOnce.current ? "?since=" + known : ""),
        )
      ).json();
      setOffline(false);
      if (s.unchanged) return;
      loadedOnce.current = true;
      if (!locked.current && s.revision >= current.current.revision) update(s);
    } catch (e) {
      if (e instanceof OfflineError) setOffline(true);
      throw e;
    }
  }, [uid, request, update, flush]);
  // Sincroniza con sistemas externos (la API y, en la demo, localStorage, que
  // solo existe en el navegador): por eso la primera carga va en un efecto.
  useEffect(() => {
    mounted.current = true;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reload()
        .then(() => setReady(true))
        .catch((e) => {
          const cached = loadCachedLibrary(user.uid);
          if (e instanceof OfflineError && cached) {
            // Sin conexión: se muestra la última copia y se guarda en cola.
            current.current = cached;
            setState(cached);
            setError("");
          } else setError(e.message);
          setReady(true);
        });
    } else {
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
      if (user)
        reload().catch((e) => {
          if (!(e instanceof OfflineError)) setError(e.message);
        });
    };
    const goOffline = () => setOffline(true);
    window.addEventListener("focus", focus);
    window.addEventListener("online", focus);
    window.addEventListener("offline", goOffline);
    // Solo se sincroniza en segundo plano con la pestaña visible (ahorra cuota).
    const timer = user
      ? window.setInterval(() => {
          if (document.visibilityState === "visible") focus();
        }, 60000)
      : undefined;
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", focus);
      window.removeEventListener("offline", goOffline);
      clearInterval(timer);
    };
  }, [user, reload, update]);
  function saveLocally(uid: string, command: Command) {
    const next = applyCommand(
      current.current,
      command,
      new Date().toISOString(),
    );
    const queue = [...loadQueue(uid), command];
    saveQueue(uid, queue);
    setPendingSync(queue.length);
    setOffline(true);
    update(next);
  }
  // silent: cambios automáticos (p. ej., refrescar la nota de la crítica)
  // que no deben sustituir la opción de deshacer el último cambio del usuario.
  async function execute(command: Command, { silent = false } = {}) {
    if (locked.current) throw new Error("Espera a que termine el guardado.");
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const before = structuredClone(current.current);
      const valid = commandSchema.parse(command);
      if (user) {
        if (offline || !navigator.onLine || loadQueue(user.uid).length)
          saveLocally(user.uid, valid);
        else
          try {
            update(await post(current.current.revision, valid));
          } catch (e) {
            if (!(e instanceof OfflineError)) throw e;
            saveLocally(user.uid, valid);
          }
      } else {
        const next = applyCommand(
          current.current,
          valid,
          new Date().toISOString(),
        );
        localStorage.setItem(key, JSON.stringify(next));
        update(next);
      }
      if (silent) {
        // Si había algo que deshacer, sigue apuntando a la revisión nueva.
        setUndoEntry((entry) =>
          entry ? { ...entry, revision: current.current.revision } : entry,
        );
      } else
        setUndoEntry(
          command.type === "import"
            ? undefined
            : { before, revision: current.current.revision },
        );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "No se ha podido guardar.";
      setError(message);
      // Tras un conflicto u otro fallo, se recupera el estado del servidor.
      locked.current = false;
      if (user) reload().catch(() => {});
      throw e;
    } finally {
      locked.current = false;
      setBusy(false);
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
    offline,
    pendingSync,
    canUndo: !!undoEntry && undoEntry.revision === state.revision,
  };
}
