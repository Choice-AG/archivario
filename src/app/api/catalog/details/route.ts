import { authenticate, json, route } from "@/server/http";
import { catalogDetails } from "@/server/catalog";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    return json(
      await catalogDetails(
        user.uid,
        Number(new URL(request.url).searchParams.get("id")),
      ),
    );
  });
}
