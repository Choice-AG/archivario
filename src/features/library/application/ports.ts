import type { Library } from "../domain/model";
export interface LibraryRepository {
  read(uid: string): Promise<Library>;
  // Revisión actual leyendo un solo documento (sin cargar la biblioteca).
  revision(uid: string): Promise<number>;
  transact(
    uid: string,
    revision: number,
    update: (s: Library) => Library,
  ): Promise<Library>;
}
export class ConflictError extends Error {}
