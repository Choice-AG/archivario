// Elige la ficha de IGDB que mejor corresponde a un título escrito a mano.
export type CatalogOption = {
  catalogId: number;
  title: string;
  cover?: string;
  genres: string[];
  platforms: string[];
  critic?: { score: number; count: number };
};

export const normalizeTitle = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export function bestMatch(title: string, options: CatalogOption[]) {
  const wanted = normalizeTitle(title);
  const exact = options.find((o) => normalizeTitle(o.title) === wanted);
  if (exact) return { option: exact, exact: true };
  // Sin coincidencia exacta, la que empieza igual (ediciones, subtítulos…).
  const close = options.find((o) => {
    const t = normalizeTitle(o.title);
    return t.startsWith(wanted) || wanted.startsWith(t);
  });
  return close ? { option: close, exact: false } : undefined;
}
