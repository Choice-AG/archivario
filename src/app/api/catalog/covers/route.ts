import { authenticateCatalog, json, route } from "@/server/http";
import { catalogCovers } from "@/server/catalog";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticateCatalog(request);
    return json(
      await catalogCovers(
        user.uid,
        Number(new URL(request.url).searchParams.get("id")),
      ),
    );
  });
}
