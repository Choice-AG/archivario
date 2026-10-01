import { applyCommand, type Command } from "../domain/model";
import type { LibraryRepository } from "./ports";
export class LibraryService {
  constructor(
    private repository: LibraryRepository,
    private now: () => string = () => new Date().toISOString(),
  ) {}
  read(uid: string) {
    return this.repository.read(uid);
  }
  // Si el cliente ya tiene la revisión actual no hace falta enviarle nada.
  async readIfChanged(uid: string, known: number) {
    if ((await this.repository.revision(uid)) === known)
      return { unchanged: true as const, revision: known };
    return this.repository.read(uid);
  }
  execute(uid: string, revision: number, command: Command) {
    if (!uid) throw new Error("Identidad requerida");
    return this.repository.transact(uid, revision, (state) =>
      applyCommand(state, command, this.now()),
    );
  }
}
