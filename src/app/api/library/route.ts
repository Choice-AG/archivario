import { authenticate, body, json, route, throttle } from "@/server/http";
import { library } from "@/server/container";
import { mutationSchema } from "@/features/library/application/validation";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    const since = new URL(request.url).searchParams.get("since");
    // ?since=N: una sola lectura cuando no hay cambios (la mayoría de sincronizaciones).
    return json(
      since !== null && /^\d{1,9}$/.test(since)
        ? await library.readIfChanged(user.uid, Number(since))
        : await library.read(user.uid),
    );
  });
}
export function POST(request: Request) {
  return route(async () => {
    const user = await authenticate(request);
    throttle("library:" + user.uid, 60);
    // Importar o deshacer envía la biblioteca completa.
    const input = mutationSchema.parse(await body(request, 4_000_000));
    return json(await library.execute(user.uid, input.revision, input.command));
  });
}
