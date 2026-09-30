import { authenticate, body, HttpError, json, route } from "@/server/http";
import { adminAuth, db } from "@/server/firebase";
import { deletionRef } from "@/server/lifecycle";
export const dynamic = "force-dynamic";
export function DELETE(request: Request) {
  return route(async () => {
    const user = await authenticate(request, true),
      input = await body(request, 1000);
    if (input.confirm !== "ELIMINAR")
      throw new HttpError(400, "Escribe ELIMINAR para confirmar.");
    if (Date.now() / 1000 - user.auth_time > 300)
      throw new HttpError(
        401,
        "Vuelve a iniciar sesión y elimina la cuenta en los próximos cinco minutos.",
      );
    await deletionRef(user.uid).set({ deleting: true });

    await db().recursiveDelete(db().collection("users").doc(user.uid));
    await db().collection("catalogLimits").doc(user.uid).delete();
    await adminAuth().deleteUser(user.uid);
    return json({ deleted: true });
  });
}
