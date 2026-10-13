import { authenticateCatalog, HttpError, json, route } from "@/server/http";
import { catalogReleases, RELEASES_MAX } from "@/server/catalog";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticateCatalog(request);
    const raw = new URL(request.url).searchParams.get("ids") ?? "";
    const ids = raw.split(",").filter(Boolean).map(Number);
    if (!ids.length || ids.length > RELEASES_MAX)
      throw new HttpError(400, "Indica entre 1 y 50 juegos.");
    return json(await catalogReleases(user.uid, ids));
  });
}
