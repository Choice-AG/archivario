import { authenticate, body, json, route, throttle } from "@/server/http";
import { follow, unfollow } from "@/server/social";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    throttle("social-follow:" + user.uid, 30);
    const input = await body(request, 1000);
    return json(await follow(user.uid, String(input.handle ?? "")));
  });
}
export function DELETE(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    throttle("social-follow:" + user.uid, 30);
    const input = await body(request, 1000);
    return json(await unfollow(user.uid, String(input.handle ?? "")));
  });
}
