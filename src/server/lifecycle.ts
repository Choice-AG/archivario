import "server-only";
import { createHash } from "node:crypto";
import { db } from "./firebase";
export function deletionRef(uid:string) {return db().collection("accountDeletionLocks").doc(createHash("sha256").update(uid).digest("hex"));}
export async function isDeleting(uid:string) {return (await deletionRef(uid).get()).exists;}
