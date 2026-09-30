import type { Library } from "../domain/model";
export interface LibraryRepository {
  read(uid: string): Promise<Library>;
  transact(
    uid: string,
    revision: number,
    update: (s: Library) => Library,
  ): Promise<Library>;
}
export class ConflictError extends Error {}
