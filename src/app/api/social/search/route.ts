import { authenticate, json, route, throttle } from "@/server/http";
import { search } from "@/server/social";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    throttle("social-search:" + user.uid, 60);
    return json(await search(new URL(request.url).searchParams.get("q") ?? ""));
  });
}
