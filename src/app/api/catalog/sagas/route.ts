import { authenticate, json, route } from "@/server/http";
import { sagaCatalog } from "@/server/catalog";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request),
      url = new URL(request.url);
    return json(
      await sagaCatalog(
        user.uid,
        (url.searchParams.get("q") ?? "").trim(),
        url.searchParams.has("id")
          ? Number(url.searchParams.get("id"))
          : undefined,
      ),
    );
  });
}
