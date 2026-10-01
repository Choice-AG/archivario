import { applyCommand, type Command, type Library } from "../domain/model";
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
  // Como execute, pero devuelve también el estado anterior (para lo social).
  async executeTracked(uid: string, revision: number, command: Command) {
    if (!uid) throw new Error("Identidad requerida");
    let prev: Library | undefined;
    const next = await this.repository.transact(uid, revision, (state) => {
      prev = state;
      return applyCommand(state, command, this.now());
    });
    return { prev: prev!, next };
  }
  execute(uid: string, revision: number, command: Command) {
    if (!uid) throw new Error("Identidad requerida");
    return this.repository.transact(uid, revision, (state) =>
      applyCommand(state, command, this.now()),
    );
  }
}
