// Cada vista tiene su propia URL; la app se monta una vez en el layout y
// deduce la vista de la ruta actual.
export const viewPaths: Record<string, string> = {
  Biblioteca: "/",
  Sagas: "/sagas",
  Diario: "/diario",
  Calendario: "/calendario",
  Favoritos: "/favoritos",
  Próximos: "/proximos",
  Perfil: "/perfil",
  Amigos: "/amigos",
};

export type Route = {
  view: string;
  gameId?: string;
  sagaId?: string;
  settings?: boolean;
  // Perfil público de otra persona (/u/<nombre>).
  handle?: string;
};
export const settingsPath = "/perfil/ajustes";

export function parsePath(pathname: string): Route {
  const game = pathname.match(/^\/juegos\/([^/]+)\/?$/);
  if (game) return { view: "Biblioteca", gameId: decodeURIComponent(game[1]) };
  const saga = pathname.match(/^\/sagas(?:\/([^/]+))?\/?$/);
  if (saga)
    return {
      view: "Sagas",
      sagaId: saga[1] ? decodeURIComponent(saga[1]) : undefined,
    };
  const person = pathname.match(/^\/u\/([^/]+)\/?$/);
  if (person) return { view: "Amigos", handle: decodeURIComponent(person[1]) };
  if (/^\/perfil\/ajustes\/?$/.test(pathname))
    return { view: "Perfil", settings: true };
  const view = Object.entries(viewPaths).find(
    ([, path]) => path !== "/" && pathname.replace(/\/$/, "") === path,
  );
  return { view: view?.[0] ?? "Biblioteca" };
}

export const gamePath = (id: string) => "/juegos/" + encodeURIComponent(id);
export const sagaPath = (id?: string) =>
  "/sagas" + (id ? "/" + encodeURIComponent(id) : "");
