import { authenticateCatalog, HttpError, json, route } from "@/server/http";
import { searchCatalog } from "@/server/catalog";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticateCatalog(request),
      url = new URL(request.url),
      q = (url.searchParams.get("q") ?? "").trim(),
      page = Number(url.searchParams.get("page") ?? 1);
    if (
      q.length < 2 ||
      q.length > 80 ||
      /[;{}\n\r]/.test(q) ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10
    )
      throw new HttpError(400, "Escribe entre 2 y 80 caracteres.");
    return json({ items: await searchCatalog(user.uid, q, page) });
  });
}
