import "server-only";
import { LibraryService } from "@/features/library/application/service";
import { FirebaseLibraryRepository } from "@/features/library/infrastructure/firebase-repository";
export const library=new LibraryService(new FirebaseLibraryRepository());
