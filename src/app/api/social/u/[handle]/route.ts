import { json, optionalUser, route, throttle } from "@/server/http";
import { profileByHandle } from "@/server/social";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Perfil público: se puede abrir sin iniciar sesión.
export function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  return route(async () => {
    const viewer = await optionalUser(request);
    throttle("social-view:" + (viewer?.uid ?? "anon"), 120);
    return json(await profileByHandle((await params).handle, viewer?.uid));
  });
}
