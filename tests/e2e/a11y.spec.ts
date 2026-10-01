import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Auditoría automática: falla con infracciones graves o críticas de WCAG A/AA.
const pages = [
  ["biblioteca", "/?demo=1"],
  ["diario", "/diario?demo=1"],
  ["calendario", "/calendario?demo=1"],
  ["sagas", "/sagas?demo=1"],
  ["saga", "/sagas/guide-kingdom-hearts?demo=1"],
  ["ficha", "/juegos/hollow?demo=1"],
  ["catalogo", "/juegos/igdb-1219?demo=1"],
] as const;

for (const [name, path] of pages)
  for (const scheme of ["dark", "light"] as const)
    test(`accesibilidad: ${name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(path);
      await page.locator("main h1").first().waitFor();
      await page.waitForTimeout(300);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const serious = results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map(
          (v) =>
            `${v.id} (${v.nodes.length}): ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(" "))
              .join(" | ")}`,
        );
      expect(serious, serious.join("\n")).toEqual([]);
    });
