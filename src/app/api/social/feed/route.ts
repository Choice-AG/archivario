import { authenticate, json, route, throttle } from "@/server/http";
import { feed, markRead } from "@/server/social";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    throttle("social-feed:" + user.uid, 30);
    return json(await feed(user.uid));
  });
}
// Marca los avisos como leídos.
export function POST(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    await markRead(user.uid);
    return json({ ok: true });
  });
}
