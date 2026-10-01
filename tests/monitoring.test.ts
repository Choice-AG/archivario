import { expect, it } from "vitest";
import { scrub } from "../src/lib/monitoring";

it("no envía a Sentry datos personales ni contenido de la petición", () => {
  const event = scrub({
    type: undefined,
    user: { id: "alice", email: "a@b.c" },
    extra: { library: "privada" },
    breadcrumbs: [{ message: "nota" }],
    request: {
      url: "https://app/juegos/x?demo=1&token=secreto",
      data: '{"note":"spoiler"}',
      cookies: { s: "1" },
      headers: { Authorization: "Bearer x" },
      query_string: "token=secreto",
    },
  });
  expect(event.user).toBeUndefined();
  expect(event.extra).toBeUndefined();
  expect(event.breadcrumbs).toBeUndefined();
  expect(event.request).toEqual({ url: "https://app/juegos/x" });
});
