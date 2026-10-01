import { json, route, throttle } from "@/server/http";
import { gameByHandle } from "@/server/social";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string; gameId: string }> },
) {
  return route(async () => {
    throttle("social-game", 600);
    const { handle, gameId } = await params;
    return json(await gameByHandle(handle, gameId));
  });
}
