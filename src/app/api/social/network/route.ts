import { authenticate, json, route } from "@/server/http";
import { network } from "@/server/social";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    return json(await network(user.uid));
  });
}
