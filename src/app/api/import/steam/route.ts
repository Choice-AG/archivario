import { authenticate, json, route, throttle } from "@/server/http";
import { steamLibrary } from "@/server/steam";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    throttle("steam:" + user.uid, 5);
    const profile = new URL(request.url).searchParams.get("profile") ?? "";
    return json({ games: await steamLibrary(profile) });
  });
}
