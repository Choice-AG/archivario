import { authenticateCatalog, json, route } from "@/server/http";
import { catalogSeries } from "@/server/catalog";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticateCatalog(request);
    return json(
      await catalogSeries(
        user.uid,
        Number(new URL(request.url).searchParams.get("id")),
      ),
    );
  });
}
