import { expect, it } from "vitest";
import { groupByMonth } from "../src/features/library/presentation/journal";

it("agrupa el diario por meses conservando el orden", () => {
  const a = (id: string, date: string) => ({ id, gameId: "g", date, note: "" });
  const groups = groupByMonth([
    a("1", "2026-10-05"),
    a("2", "2026-10-01"),
    a("3", "2026-09-30"),
    a("4", "2025-10-02"),
  ]);
  expect(groups.map((g) => [g.month, g.items.map((i) => i.id)])).toEqual([
    ["2026-10", ["1", "2"]],
    ["2026-09", ["3"]],
    ["2025-10", ["4"]],
  ]);
});
