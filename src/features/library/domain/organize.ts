import { tagKey, type Format, type Library } from "./model";

export const formatLabels: Record<Format, string> = {
  físico: "Físico",
  digital: "Digital",
  suscripción: "Por suscripción",
  prestado: "Prestado",
};

// Tus etiquetas con cuántos juegos tiene cada una, de más a menos usadas.
// Si una etiqueta aparece escrita de varias formas, gana la más usada.
export function allTags(state: Library) {
  const groups = new Map<string, Map<string, number>>();
  for (const g of state.games)
    for (const t of g.tags ?? []) {
      const forms = groups.get(tagKey(t)) ?? new Map<string, number>();
      forms.set(t, (forms.get(t) ?? 0) + 1);
      groups.set(tagKey(t), forms);
    }
  return [...groups.values()]
    .map((forms) => {
      const [name] = [...forms].sort((a, b) => b[1] - a[1])[0];
      const count = [...forms.values()].reduce((s, n) => s + n, 0);
      return { name, count };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
}

// Quién te ha recomendado juegos, para sugerirlo y filtrar.
export function recommenders(state: Library) {
  const names = new Map<string, string>();
  for (const g of state.games) {
    const name = g.recommendedBy?.trim();
    if (name && !names.has(tagKey(name))) names.set(tagKey(name), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, "es"));
}
