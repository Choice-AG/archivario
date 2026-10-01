import { test, expect, type Locator, type Page } from "@playwright/test";

// La demo con ?demo=1 es determinista: no depende de si Firebase está configurado.
async function openDemo(page: Page, path = "/") {
  await page.goto(path + "?demo=1");
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura empieza aquí." }),
  ).toBeVisible();
}
// Los filtros secundarios viven en un panel plegable.
async function openFilters(page: Page) {
  const toggle = page.getByRole("button", { name: /^Filtros/ });
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click();
  await expect(page.locator("#library-filters")).toBeVisible();
}
// El estado de cada tarjeta es un menú propio, no un <select>.
const statusButton = (scope: Page | Locator, title: string) =>
  scope.getByRole("button", { name: new RegExp("^Estado de " + title + ":") });
async function chooseStatus(
  page: Page,
  scope: Page | Locator,
  title: string,
  status: string,
) {
  await statusButton(scope, title).click();
  await page
    .getByRole("menuitemradio", {
      name: status[0].toUpperCase() + status.slice(1),
      exact: true,
    })
    .click();
}
function demoData(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("archivario-demo-v1") ?? "{}"),
  );
}
test("biblioteca, actividad, notas, rejugada e importación", async ({
  page,
}) => {
  await openDemo(page);
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura empieza aquí." }),
  ).toBeVisible();
  const hades = page.locator("article").filter({
    has: page.getByRole("button", { name: "Abrir Hades", exact: true }),
  });
  await hades
    .getByRole("button", { name: "He jugado hoy", exact: true })
    .click();
  await expect(
    hades.getByRole("button", { name: "Registrado hoy" }),
  ).toBeVisible();
  await hades.getByRole("button", { name: "Registrado hoy" }).click();
  await expect
    .poll(async () =>
      (await demoData(page)).activities.filter(
        (a: { gameId: string }) => a.gameId === "hades",
      ),
    )
    .toHaveLength(1);
  await hades.getByRole("button", { name: "Abrir Hades", exact: true }).click();
  await page.getByRole("button", { name: "Editar notas", exact: true }).click();
  await page.getByLabel("Tu reseña personal").fill("Un viaje extraordinario.");
  await page.getByText("Mostrar notas con spoilers", { exact: true }).click();
  await page
    .getByLabel("Notas privadas con spoilers")
    .fill("Mi spoiler privado");
  await page.getByRole("button", { name: "Guardar notas" }).click();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Gestionar partidas", exact: true })
    .click();
  await page.getByRole("button", { name: "Nueva partida o rejugada" }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la partida" })
    .last()
    .fill("Segunda escapada");
  await page.getByRole("button", { name: "Guardar partida" }).last().click();
  await expect(
    page.locator("summary").filter({ hasText: "Segunda escapada" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Volver a la biblioteca", exact: true })
    .click();
  await page.getByRole("button", { name: "Añadir juego", exact: true }).click();
  await page.getByRole("button", { name: "Añadir manualmente" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Aventura de prueba");
  await page.getByLabel("Plataformas", { exact: false }).fill("PC, Switch");
  await page.getByRole("button", { name: "Añadir a mi biblioteca" }).click();
  await expect(
    page.getByRole("button", { name: "Abrir Aventura de prueba" }),
  ).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem(
      "partida-demo-v1",
      localStorage.getItem("archivario-demo-v1")!,
    );
    localStorage.removeItem("archivario-demo-v1");
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura empieza aquí." }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Archivario · Tus juegos, a tu ritmo");
  await expect(
    page.getByRole("button", { name: "Abrir Aventura de prueba" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("partida-demo-v1")))
    .toBeNull();
  const mobile = (page.viewportSize()?.width ?? 1440) <= 640;
  if (mobile)
    await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  else await page.locator(".profile-button").click();
  const backup = await page.evaluate(() =>
    JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(localStorage.getItem("archivario-demo-v1")!),
    }),
  );
  await page
    .locator('input[type="file"][accept=".json,application/json"]')
    .setInputFiles({
      name: "archivario.json",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
  await expect(page.getByText("Vista previa · formato v1")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar importación" }).click();
  await expect(
    page.getByText("Importación completada.", { exact: true }),
  ).toBeVisible();
});
test("calendario adaptable y API cerrada", async ({ page, request }) => {
  expect((await request.get("/api/library")).status()).toBe(401);
  await openDemo(page);
  const mobile = (page.viewportSize()?.width ?? 1440) <= 640;
  await page
    .locator(mobile ? ".bottom-nav" : ".sidebar nav")
    .getByRole("button", { name: "Calendario", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tu calendario de aventuras." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("filtros de valoración, orden y resumen anual", async ({ page }) => {
  await openDemo(page);
  await page.getByLabel("Ordenar biblioteca").selectOption("rating");
  const ratings = await page.locator(".game-card .rating").allTextContents();
  expect(ratings.length).toBeGreaterThan(0);
  await openFilters(page);
  await page.getByLabel("Filtrar por valoración").selectOption("unrated");
  await expect(page.getByRole("button", { name: /^Filtros/ })).toHaveText(/1/);
  await expect(page.locator(".game-card .rating")).toHaveCount(0);
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.getByLabel("Filtrar por valoración")).toHaveValue("all");
  await page.getByRole("button", { name: "Mi resumen anual" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu año en juegos" }),
  ).toBeVisible();
  await expect(page.getByLabel("Año del resumen")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.getByLabel("Ordenar biblioteca")).toBeVisible();
});
test("listas, deseos, reseña de rejugada, selector y comparador", async ({
  page,
}) => {
  await openDemo(page);
  await page
    .getByRole("button", { name: "Listas y planes", exact: true })
    .click();
  await page.getByRole("button", { name: "Nueva lista", exact: true }).click();
  await page.getByLabel("Nombre de la lista").fill("Viajes por vivir");
  await page.getByLabel("Descripción de la lista").fill("Para este otoño");
  await page.getByRole("button", { name: "+ Hades", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Hollow Knight", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Subir Hollow Knight", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar lista", exact: true })
    .click();
  await expect(page.locator(".personal-list ol li").first()).toHaveText(
    "Hollow Knight",
  );
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
  await page.getByLabel("Hades", { exact: true }).check();
  await page.getByLabel("Hollow Knight", { exact: true }).check();
  await expect(
    page.getByRole("region", { name: "Comparación de juegos" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "¿A qué juego hoy?", exact: true })
    .click();
  await page.getByRole("button", { name: "Elegir un juego al azar" }).click();
  await expect(
    page.getByRole("button", { name: "Abrir juego elegido" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Abrir Hades", exact: true }).click();
  await page.getByRole("button", { name: "Editar juego", exact: true }).click();
  await page
    .getByLabel("Lista de deseos (aún no lo tengo)", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Guardar ficha", exact: true })
    .click();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Gestionar partidas", exact: true })
    .click();
  await page.getByLabel("Valoración de esta partida").selectOption("8.5");
  await page.getByLabel("Reseña de esta partida").fill("Me ha gustado aún más");
  await page
    .getByRole("button", { name: "Guardar partida", exact: true })
    .click();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Volver a la biblioteca", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Abrir Hades", exact: true }),
  ).toHaveCount(0);
  await openFilters(page);
  await page
    .getByLabel("Disponibilidad de los juegos")
    .selectOption("wishlist");
  await expect(
    page.getByRole("button", { name: "Abrir Hades", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("heading", { name: "Tu próxima aventura empieza aquí." })
    .waitFor();
  await openFilters(page);
  await page
    .getByLabel("Disponibilidad de los juegos")
    .selectOption("wishlist");
  await page.getByRole("button", { name: "Abrir Hades", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Gestionar partidas", exact: true })
    .click();
  await expect(page.getByLabel("Reseña de esta partida")).toHaveValue(
    "Me ha gustado aún más",
  );
  await expect(page.getByLabel("Valoración de esta partida")).toHaveValue(
    "8.5",
  );
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Volver a la biblioteca", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Listas y planes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Viajes por vivir" }),
  ).toBeVisible();
});
test("estados rápidos, retomar, tiempos, búsqueda, varios días y deshacer", async ({
  page,
}) => {
  await openDemo(page);
  const card = page.locator("article").filter({
    has: page.getByRole("button", {
      name: "Abrir Hollow Knight",
      exact: true,
    }),
  });
  await card.getByText("Retomar partida", { exact: true }).click();
  await expect(card.getByText(/Explorando Ciudad/)).toBeVisible();
  await chooseStatus(page, page, "Hollow Knight", "completado");
  await expect(statusButton(page, "Hollow Knight")).toHaveAttribute(
    "data-status",
    "completado",
  );
  await page
    .getByRole("button", { name: "Deshacer último cambio", exact: true })
    .click();
  await expect(statusButton(page, "Hollow Knight")).toHaveAttribute(
    "data-status",
    "jugando",
  );
  await page
    .getByRole("button", { name: "Abrir Hollow Knight", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ajustar estimaciones", exact: true })
    .click();
  await page
    .getByLabel("Historia principal (h)", { exact: false })
    .fill("12.5");
  await page.getByLabel("Historia + extras (h)", { exact: false }).fill("25");
  await page.getByLabel("Completar al 100 % (h)", { exact: false }).fill("40");
  await page
    .getByRole("button", { name: "Guardar tiempos", exact: true })
    .click();
  await expect(
    page.getByText("Tiempos guardados.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Volver a la biblioteca", exact: true })
    .click();
  await expect(
    card.getByText("Historia principal: 12,5 h", { exact: true }),
  ).toBeVisible();
  await openFilters(page);
  await page
    .getByLabel("Tipo de duración", { exact: true })
    .selectOption("extras");
  await expect(
    card.getByText("Historia + extras: 25 h", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Buscar en mi biblioteca", { exact: true })
    .fill("Ciudad de Lágrimas");
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  const mobile = (page.viewportSize()?.width ?? 1440) <= 640;
  await page
    .locator(mobile ? ".bottom-nav" : ".sidebar nav")
    .getByRole("button", { name: "Calendario", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar varios días", exact: true })
    .click();
  await page.getByLabel("Mes para seleccionar días").fill("2026-01");
  await page
    .getByRole("button", { name: "Seleccionar 2026-01-03", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Seleccionar 2026-01-05", exact: true })
    .click();
  await page.getByLabel("Nota para los días nuevos").fill("Exploración");
  await page
    .getByRole("button", { name: "Guardar días seleccionados", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await demoData(page)).activities.filter(
        (a: { note: string }) => a.note === "Exploración",
      ),
    )
    .toHaveLength(2);
  await page
    .getByRole("button", { name: "Deshacer último cambio", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await demoData(page)).activities.filter(
        (a: { note: string }) => a.note === "Exploración",
      ),
    )
    .toHaveLength(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("ficha propia, enlaces de sección y navegación del navegador", async ({
  page,
}, testInfo) => {
  await page.goto("/?demo=1");
  await page
    .getByRole("button", { name: "Abrir Hollow Knight", exact: true })
    .click();
  await expect(page).toHaveURL(/\/juegos\/hollow\?demo=1/);
  await expect(
    page.getByRole("heading", { name: "Hollow Knight", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "¿Cuánto dura?", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar juego", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Mi reseña", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mi reseña", exact: true }),
  ).toBeInViewport();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hollow Knight", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver a la biblioteca", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Abrir Hollow Knight", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Hollow Knight", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("game-page.png"),
    fullPage: true,
  });
});

test("sagas preparadas, recorrido, edición, guardado y enlace directo", async ({
  page,
}, testInfo) => {
  await page.goto("/sagas?demo=1");
  await expect(
    page.getByRole("heading", { name: "Historias que merecen un recorrido." }),
  ).toBeVisible();
  await expect(page.locator(".saga-tile")).toHaveCount(7);
  await page
    .locator(".saga-tile")
    .filter({
      has: page.getByRole("heading", { name: "Kingdom Hearts", exact: true }),
    })
    .click();
  await expect(page).toHaveURL(/sagas\/guide-kingdom-hearts/);
  await expect(page.locator(".saga-step")).toHaveCount(13);
  await page.getByText("Guía visual del recorrido", { exact: true }).click();
  await expect(page.locator(".saga-map ol li")).toHaveCount(13);
  await page.getByLabel("Ver orden", { exact: true }).selectOption("release");
  await page.getByLabel("Ver orden", { exact: true }).selectOption("guide");
  await page.getByRole("button", { name: "Guardar saga", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Guardar saga", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Editar guía", exact: true }).click();
  await page
    .getByLabel("Descripción de la saga", { exact: true })
    .fill("Mi recorrido de Kingdom Hearts");
  await page.getByRole("button", { name: "Guardar guía", exact: true }).click();
  await expect(
    page.locator(".saga-hero").getByText("Mi recorrido de Kingdom Hearts"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".saga-hero").getByText("Mi recorrido de Kingdom Hearts"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("saga.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Volver a Sagas", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mis sagas", exact: true }),
  ).toBeVisible();
});

test("saga: consultar un juego sin tenerlo y añadirlo desde su ficha", async ({
  page,
}) => {
  await page.goto("/sagas/guide-kingdom-hearts?demo=1");
  await page.locator(".saga-game-link").first().click();
  await expect(page).toHaveURL(/juegos\/igdb-1219/);
  await expect(
    page.getByRole("heading", { name: "Kingdom Hearts", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sobre el juego", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Kingdom Hearts", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Añadir a mi biblioteca", exact: true })
    .click();
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
    "Kingdom Hearts",
  );
  await page.getByLabel("Plataformas", { exact: false }).fill("PlayStation 2");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Añadir a mi biblioteca", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Registrar actividad", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      (await demoData(page)).games.filter(
        (g: { catalogId: number }) => g.catalogId === 1219,
      ),
    )
    .toHaveLength(1);
  await page.goto("/sagas/guide-kingdom-hearts?demo=1");
  await page.locator(".saga-game-link").first().click();
  await expect(page).not.toHaveURL(/igdb-1219/);
});

test("desglose diario completo, edición de una nota y pendientes en Próximos", async ({
  page,
}, testInfo) => {
  await page.goto("/?demo=1");
  for (const name of ["Hades", "Hollow Knight"]) {
    const card = page.locator(".game-card").filter({
      has: page.getByRole("button", { name: "Abrir " + name, exact: true }),
    });
    await card
      .getByRole("button", { name: "He jugado hoy", exact: true })
      .or(card.getByRole("button", { name: "Registrado hoy", exact: true }))
      .click();
  }
  await chooseStatus(page, page, "Hades", "pendiente");
  const mobileView = (page.viewportSize()?.width ?? 1440) <= 640;
  const nav = page.locator(mobileView ? ".bottom-nav" : ".sidebar nav");
  // En móvil, Próximos es una vista dentro de la biblioteca.
  await page
    .locator(mobileView ? ".library-views" : ".sidebar nav")
    .getByRole("button", { name: "Próximos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Abrir Hades", exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Calendario", exact: true }).click();
  await page.locator(".calendar-day.today").click();
  await expect(
    page.getByRole("heading", { name: "Tu día de juego", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".day-game").filter({ hasText: "Hades" }),
  ).toBeVisible();
  await expect(
    page.locator(".day-game").filter({ hasText: "Hollow Knight" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar actividad de Hades", exact: true })
    .click();
  await page
    .getByLabel("Algo para recordar", { exact: false })
    .fill("Hoy probé el escudo");
  await page
    .getByRole("button", { name: "Guardar actividad", exact: true })
    .click();
  await expect(
    page.locator(".day-game").filter({ hasText: "Hades" }),
  ).toContainText("Hoy probé el escudo");
  await expect(
    page.locator(".day-game").filter({ hasText: "Hollow Knight" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("day-breakdown.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("buscador global, continuar, lote y varios juegos en un día", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await expect(
    page.getByRole("heading", { name: "Continuar donde lo dejé" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buscar en Archivario" }).click();
  await page.getByLabel("Buscar en todo").fill("Kingdom");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Kingdom Hearts/ })
    .click();
  await expect(page).toHaveURL(/sagas\/guide-kingdom-hearts/);
  await page.getByLabel("Ocultar opcionales").check();
  await expect(page.locator(".saga-step")).toHaveCount(12);
  await expect(
    page.getByText("Tu siguiente juego", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".saga-alternatives")).not.toHaveCount(0);
  const nav = page.locator(
    (page.viewportSize()?.width ?? 1440) <= 640
      ? ".bottom-nav"
      : ".sidebar nav",
  );
  await nav.getByRole("button", { name: "Biblioteca", exact: false }).click();
  await page
    .getByRole("button", { name: "Seleccionar juegos", exact: true })
    .click();
  await page.getByLabel("Seleccionar Hades", { exact: true }).check();
  await page.getByLabel("Seleccionar Hollow Knight", { exact: true }).check();
  await page
    .getByRole("button", { name: "Aplicar estado", exact: true })
    .click();
  await expect(statusButton(page, "Hades")).toHaveAttribute(
    "data-status",
    "pendiente",
  );
  await expect(statusButton(page, "Hollow Knight")).toHaveAttribute(
    "data-status",
    "pendiente",
  );
  await page
    .getByRole("button", { name: "Deshacer último cambio", exact: true })
    .click();
  await expect(statusButton(page, "Hades")).toHaveAttribute(
    "data-status",
    "jugando",
  );
  await nav.getByRole("button", { name: "Calendario", exact: true }).click();
  await page.locator(".calendar-day.today").click();
  await page
    .getByRole("button", { name: "Añadir juegos", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /^Hades/ }).check();
  await page.getByRole("checkbox", { name: /^Hollow Knight/ }).check();
  await page
    .getByLabel("Nota para Hades", { exact: true })
    .fill("Una escapada más");
  await page
    .getByLabel("Nota para Hollow Knight", { exact: true })
    .fill("Explorando");
  await page
    .getByRole("button", { name: "Guardar 2 juegos del día", exact: true })
    .click();
  await expect(
    page.locator(".day-game").filter({ hasText: "Hades" }),
  ).toContainText("Una escapada más");
  await expect(
    page.locator(".day-game").filter({ hasText: "Hollow Knight" }),
  ).toContainText("Explorando");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("guardar saga confirma su ubicación y la biblioteca permite encontrarla", async ({
  page,
}) => {
  await page.goto("/sagas/guide-kingdom-hearts?demo=1");
  await page.getByRole("button", { name: "Guardar saga", exact: true }).click();
  await expect(page.locator(".saga-save-status")).toContainText(
    "Guardada en Mis sagas",
  );
  await page
    .getByRole("button", { name: "Ver mis sagas", exact: true })
    .click();
  await expect(
    page
      .locator(".saved-sagas")
      .getByRole("heading", { name: "Kingdom Hearts", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator(".saved-sagas")
      .getByRole("heading", { name: "Kingdom Hearts", exact: true }),
  ).toBeVisible();
  const nav = page.locator(
    (page.viewportSize()?.width ?? 1440) <= 640
      ? ".bottom-nav"
      : ".sidebar nav",
  );
  await nav.getByRole("button", { name: "Biblioteca", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Mis sagas (1)", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".game-card")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Mis sagas (1)", exact: true })
    .click();
  await page.locator(".saved-sagas .saga-tile").click();
  await expect(page.locator(".saga-save-status")).toContainText(
    "Guardada en Mis sagas",
  );
  await expect(
    page.getByRole("button", { name: "Guardar saga", exact: true }),
  ).toHaveCount(0);
});

test("sin errores de consola ni bloqueos de CSP", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await openDemo(page);
  await page
    .getByRole("button", { name: "Abrir Hollow Knight", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hollow Knight", exact: true }),
  ).toBeVisible();
  await page.goto("/sagas/guide-kingdom-hearts?demo=1");
  await expect(page.locator(".saga-step").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("atajo de búsqueda, ficha manual simplificada y fechas legibles", async ({
  page,
}) => {
  await openDemo(page);
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("heading", { name: "Buscar juegos y sagas" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Abrir Hollow Knight", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Completa la ficha", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Otros juegos de la saga" }),
  ).toHaveCount(0);
  await expect(page.locator(".game-journal-row time").first()).toHaveText(
    /^\d{1,2} [a-z]{3,4}\.? \d{4}$/,
  );
  await expect(
    page.getByRole("button", { name: "Vincular con IGDB" }),
  ).toHaveCount(0);
});

test("el aviso de guardado permite deshacer", async ({ page }) => {
  await openDemo(page);
  const card = page.locator(".game-card").filter({
    has: page.getByRole("button", { name: "Abrir Celeste", exact: true }),
  });
  await chooseStatus(page, card, "Celeste", "jugando");
  const toast = page.getByRole("status").filter({ hasText: "Guardado" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Deshacer último cambio" }).click();
  await expect(statusButton(card, "Celeste")).toHaveAttribute(
    "data-status",
    "pendiente",
  );
});

test("cada vista tiene su propia URL y título", async ({ page }) => {
  await page.goto("/diario?demo=1");
  await expect(
    page.getByRole("heading", { name: "Lo que has estado jugando." }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Diario · Archivario");
  const mobile = (page.viewportSize()?.width ?? 1440) <= 640;
  await page
    .locator(mobile ? ".bottom-nav" : ".sidebar nav")
    .getByRole("button", { name: "Calendario", exact: true })
    .click();
  await expect(page).toHaveURL(/\/calendario\?demo=1$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/diario\?demo=1$/);
  await expect(
    page.getByRole("heading", { name: "Lo que has estado jugando." }),
  ).toBeVisible();
});

test("importa juegos desde un CSV sin duplicar los existentes", async ({
  page,
}) => {
  await openDemo(page);
  const mobile = (page.viewportSize()?.width ?? 1440) <= 640;
  if (mobile)
    await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  else await page.locator(".profile-button").click();
  await page
    .locator('input[type="file"][accept=".csv,text/csv"]')
    .setInputFiles({
      name: "juegos.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Título;Plataforma;Estado;Nota\nHades;Switch;jugando;9\nPentiment;PC;completado;8,5\nTunic;PC;;\n",
      ),
    });
  const preview = page.locator(".import-preview");
  await expect(preview).toContainText("2 juegos nuevos");
  await expect(preview).toContainText("1 ya estaba en tu biblioteca");
  await preview.getByRole("button", { name: "Importar 2 juegos" }).click();
  await expect(page.getByText(/2 juegos importados/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Buscar en mi biblioteca").fill("Pentiment");
  await expect(
    page.getByRole("button", { name: "Abrir Pentiment", exact: true }),
  ).toBeVisible();
});

test("se puede instalar y abrir sin conexión", async ({ page, context }) => {
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.short_name).toBe("Archivario");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Segunda visita con el service worker activo para que guarde la página.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura empieza aquí." }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura empieza aquí." }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("atajos de una tecla para añadir, buscar, registrar y ver la ayuda", async ({
  page,
}) => {
  await openDemo(page);
  await page.keyboard.press("Shift+?");
  await expect(
    page.getByRole("heading", { name: "Atajos de teclado" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("n");
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura", exact: true }),
  ).toBeVisible();
  // Escribir dentro de un campo no dispara atajos.
  await page.getByPlaceholder("Escribe el nombre de un juego…").fill("nd/");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.keyboard.press("/");
  await expect(page.getByLabel("Buscar en mi biblioteca")).toBeFocused();
  await page.getByLabel("Buscar en mi biblioteca").press("Escape");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("d");
  await expect(
    page.getByRole("heading", { name: "Tu día de juego" }),
  ).toBeVisible();
});
