import { authenticate, json, route, throttle } from "@/server/http";
import { steamLibrary, steamWishlist } from "@/server/steam";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    throttle("steam:" + user.uid, 5);
    const params = new URL(request.url).searchParams;
    const profile = params.get("profile") ?? "";
    return json({
      games:
        params.get("lista") === "deseos"
          ? await steamWishlist(profile)
          : await steamLibrary(profile),
    });
  });
}
