// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Markdown } from "../src/features/library/presentation/markdown";
afterEach(cleanup);

it("da formato básico a las reseñas sin inyectar HTML", () => {
  const { container } = render(
    createElement(Markdown, {
      text: "Un **viaje** *precioso*.\nSegunda línea.\n\n- Música\n- Arte\n\n1. Uno\n2. Dos\n\n[Guía](https://example.com) <img src=x onerror=alert(1)> [malo](javascript:alert(1))",
    }),
  );
  expect(container.querySelector("strong")?.textContent).toBe("viaje");
  expect(container.querySelector("em")?.textContent).toBe("precioso");
  expect(container.querySelectorAll("p")[0].querySelector("br")).not.toBeNull();
  expect(
    [...container.querySelectorAll("ul li")].map((l) => l.textContent),
  ).toEqual(["Música", "Arte"]);
  expect(container.querySelectorAll("ol li")).toHaveLength(2);
  const link = container.querySelector("a")!;
  expect(link.getAttribute("href")).toBe("https://example.com");
  expect(link.getAttribute("rel")).toContain("noopener");
  // Ni HTML crudo ni enlaces javascript:
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelectorAll("a")).toHaveLength(1);
  expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
});
