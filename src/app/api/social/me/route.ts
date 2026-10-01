import { authenticate, body, json, route, throttle } from "@/server/http";
import { library } from "@/server/container";
import { account, disable, enable, unreadCount } from "@/server/social";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    const me = await account(user.uid);
    return json(
      me
        ? {
            enabled: true,
            handle: me.handle,
            unread: await unreadCount(user.uid),
          }
        : { enabled: false, unread: 0 },
    );
  });
}
// Activa el perfil público o cambia el nombre de usuario.
export function PUT(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    throttle("social-me:" + user.uid, 10);
    const input = await body(request, 2000);
    return json(
      await enable(
        user.uid,
        String(input.handle ?? ""),
        await library.read(user.uid),
      ),
    );
  });
}
// Desactiva lo social y borra todo lo público.
export function DELETE(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    await disable(user.uid);
    return json({ enabled: false });
  });
}
