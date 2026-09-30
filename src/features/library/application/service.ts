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
  execute(uid: string, revision: number, command: Command) {
    if (!uid) throw new Error("Identidad requerida");
    return this.repository.transact(uid, revision, (state) =>
      applyCommand(state, command, this.now()),
    );
  }
}
