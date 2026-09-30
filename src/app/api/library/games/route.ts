import { authenticate, HttpError, json, route } from "@/server/http";
import { library } from "@/server/container";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request),
      url = new URL(request.url),
      page = Number(url.searchParams.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 1000)
      throw new HttpError(400, "Página no válida.");
    const s = await library.read(user.uid),
      items = [...s.games].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
    return json({
      items: items.slice((page - 1) * 24, page * 24),
      page,
      total: items.length,
    });
  });
}
