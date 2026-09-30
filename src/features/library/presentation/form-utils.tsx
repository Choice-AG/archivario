export const value = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export const list = (s: string) => [
  ...new Set(
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];
const ratings = Array.from({ length: 19 }, (_, i) => 1 + i * 0.5);
export function RatingOptions() {
  return (
    <>
      <option value="">Sin valorar</option>
      {ratings.map((n) => (
        <option key={n} value={n}>
          {n.toLocaleString("es")} / 10
        </option>
      ))}
    </>
  );
}
