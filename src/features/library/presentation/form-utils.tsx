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
