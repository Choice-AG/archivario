// Firestore en memoria con lo que usan los repositorios: rutas anidadas,
// get/getAll/set/delete, transacciones y lotes. Registra las escrituras.
export function createFakeFirestore() {
  const store = new Map<string, Record<string, unknown>>();
  const writes: string[] = [];
  const snap = (path: string) => ({
    id: path.split("/").pop()!,
    exists: store.has(path),
    data: () => structuredClone(store.get(path)),
  });
  const doc = (path: string) => ({
    path,
    id: path.split("/").pop()!,
    get: async () => snap(path),
    set: async (data: Record<string, unknown>) => {
      writes.push("set " + path);
      store.set(path, structuredClone(data));
    },
    delete: async () => {
      writes.push("delete " + path);
      store.delete(path);
    },
    collection: (name: string) => collection(path + "/" + name),
  });
  const collection = (path: string) => ({
    doc: (id: string) => doc(path + "/" + id),
  });
  type Ref = { path: string };
  const db = {
    collection: (name: string) => collection(name),
    getAll: async (...refs: Ref[]) => refs.map((r) => snap(r.path)),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
      // Escrituras diferidas hasta el final, como en Firestore.
      const pending: (() => void)[] = [];
      const result = await fn({
        get: async (ref: Ref) => snap(ref.path),
        getAll: async (...refs: Ref[]) => refs.map((r) => snap(r.path)),
        set: (ref: Ref, data: Record<string, unknown>) =>
          pending.push(() => {
            writes.push("set " + ref.path);
            store.set(ref.path, structuredClone(data));
          }),
        delete: (ref: Ref) =>
          pending.push(() => {
            writes.push("delete " + ref.path);
            store.delete(ref.path);
          }),
      });
      pending.forEach((w) => w());
      return result;
    },
    recursiveDelete: async (ref: Ref) => {
      for (const key of [...store.keys()])
        if (key === ref.path || key.startsWith(ref.path + "/"))
          store.delete(key);
    },
  };
  return { db, store, writes };
}
