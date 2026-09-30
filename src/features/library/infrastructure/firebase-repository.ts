import "server-only";
import { db } from "@/server/firebase";
import { deletionRef } from "@/server/lifecycle";
import { emptyLibrary, type Library } from "../domain/model";
import {
  ConflictError,
  type LibraryRepository,
} from "../application/ports";
export function stateRef(uid: string) {
  if (!uid || uid.includes("/"))
    throw new Error("Identidad no válida");
  return db()
    .collection("users")
    .doc(uid)
    .collection("private")
    .doc("library");
}
export class FirebaseLibraryRepository implements LibraryRepository {
  async read(uid: string) {
    return (
      ((await stateRef(uid).get()).data() as Library) ??
      emptyLibrary()
    );
  }
  async transact(
    uid: string,
    revision: number,
    update: (s: Library) => Library,
  ) {
    return db().runTransaction(async (transaction) => {
      if ((await transaction.get(deletionRef(uid))).exists)
        throw new ConflictError("La cuenta se está eliminando.");
      const ref = stateRef(uid),
        document = await transaction.get(ref);
      const current = document.exists
        ? (document.data() as Library)
        : emptyLibrary();
      if (current.revision !== revision)
        throw new ConflictError(
          "Tu biblioteca cambió en otro dispositivo. Se ha actualizado; vuelve a guardar.",
        );
      const next = update(current);
      transaction.set(ref, next);
      return next;
    });
  }
}
