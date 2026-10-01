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
// El perfil se abre desde el avatar y los ajustes, desde el perfil.
async function openProfile(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 640;
  if (mobile)
    await page.getByRole("button", { name: "Perfil", exact: true }).click();
  else await page.locator(".profile-button").click();
  await expect(page).toHaveURL(/\/perfil/);
  return mobile;
}
async function openSettings(page: Page) {
  const mobile = await openProfile(page);
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await expect(page).toHaveURL(/\/perfil\/ajustes/);
  return mobile;
}
// Pestañas de la ficha del juego.
async function openTab(page: Page, name: string) {
  await page.getByRole("tab", { name: new RegExp("^" + name) }).click();
  await expect(
    page.getByRole("tab", { name: new RegExp("^" + name) }),
  ).toHaveAttribute("aria-selected", "true");
}
// La valoración se elige con estrellas; con teclado va de media en media.
async function setRating(page: Page, label: string, value: number) {
  const stars = page.getByRole("slider", { name: label });
  await stars.focus();
  await stars.press("Home");
  for (let n = 1; n < value; n += 0.5) await stars.press("ArrowRight");
  await expect(stars).toHaveAttribute("aria-valuenow", String(value));
}
// Marca una plataforma en «¿En qué lo juegas?» (sin desmarcarla si ya lo está).
async function pickPlatform(page: Page, name: string) {
  const chip = page
    .getByRole("dialog")
    .getByRole("button", { name, exact: true });
  if ((await chip.getAttribute("aria-pressed")) !== "true") await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
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
  await openTab(page, "Reseña");
  await page.getByRole("button", { name: "Editar notas", exact: true }).click();
  await page.getByLabel("Tu reseña personal").fill("Un viaje extraordinario.");
  await page.getByText("Mostrar notas con spoilers", { exact: true }).click();
  await page
    .getByLabel("Notas privadas con spoilers")
    .fill("Mi spoiler privado");
  await page.getByRole("button", { name: "Guardar notas" }).click();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await openTab(page, "Partidas");
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
  await page.getByRole("button", { name: "Añádelo a mano" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Aventura de prueba");
  await pickPlatform(page, "PC");
  await pickPlatform(page, "Switch");
  await page.getByRole("button", { name: "Añadir a mi biblioteca" }).click();
  await expect(page.getByText("ya está en tu biblioteca")).toBeVisible();
  await page.getByRole("button", { name: "Listo", exact: true }).click();
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
  await openSettings(page);
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
  await openTab(page, "Partidas");
  await page
    .getByRole("button", { name: "Gestionar partidas", exact: true })
    .click();
  await setRating(page, "Valoración de esta partida", 8.5);
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
  await openTab(page, "Partidas");
  await page
    .getByRole("button", { name: "Gestionar partidas", exact: true })
    .click();
  await expect(page.getByLabel("Reseña de esta partida")).toHaveValue(
    "Me ha gustado aún más",
  );
  await expect(
    page.getByRole("slider", { name: "Valoración de esta partida" }),
  ).toHaveAttribute("aria-valuenow", "8.5");
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
  // Completar un juego lo celebra e invita a la reseña.
  await expect(
    page.getByRole("heading", { name: "¡Has completado Hollow Knight!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ahora no" }).click();
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
    page.getByRole("heading", { name: "Duración", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar juego", exact: true }),
  ).toBeVisible();
  await openTab(page, "Reseña");
  await expect(page).toHaveURL(/#resena$/);
  await expect(
    page.getByRole("heading", { name: "Mi reseña", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Duración", exact: true }),
  ).toHaveCount(0);
  // La pestaña sobrevive a recargar y Atrás vuelve al resumen.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mi reseña", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Duración", exact: true }),
  ).toBeVisible();
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
  await expect(page.locator(".add-chosen")).toContainText("Kingdom Hearts");
  await page.getByLabel("Otra plataforma").fill("PlayStation 2");
  await page.getByLabel("Otra plataforma").press("Enter");
  await pickPlatform(page, "PlayStation 2");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Añadir a mi biblioteca", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "He jugado hoy", exact: true }),
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
  await openTab(page, "Sobre el juego");
  await expect(
    page.getByRole("heading", { name: "Completa la ficha", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Otros juegos de la saga" }),
  ).toHaveCount(0);
  await openTab(page, "Diario");
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
  const mobile = await openSettings(page);
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
  await page
    .locator(mobile ? ".bottom-nav" : ".sidebar nav")
    .getByRole("button", { name: /^Biblioteca/ })
    .click();
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

test("el diario se agrupa por meses y se filtra por juego", async ({
  page,
}) => {
  await page.goto("/diario?demo=1");
  await expect(page.locator(".journal-month h3").first()).toContainText(
    /^[A-ZÁÉÍÓÚ][a-záéíóú]+ de \d{4}/,
  );
  const total = await page.locator(".activity-row").count();
  await page
    .locator(".journal-filters select")
    .selectOption({ label: "Hollow Knight" });
  await expect(page.locator(".activity-row strong")).toHaveText([
    "Hollow Knight",
  ]);
  await page.getByRole("button", { name: "Quitar filtros" }).click();
  await expect(page.locator(".activity-row")).toHaveCount(total);
});

test("el perfil muestra tu resumen, tu escaparate y tu año", async ({
  page,
}) => {
  await openDemo(page);
  await openProfile(page);
  await expect(
    page.getByRole("heading", { name: "Alex", level: 1 }),
  ).toBeVisible();
  await expect(page.locator(".profile-stats")).toContainText(
    "en la biblioteca",
  );
  await expect(page.locator(".heatmap [role=status]")).toContainText(
    /\d+ días? jugados?/,
  );
  // Los ajustes no se muestran en el perfil.
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Elegir destacados" }).click();
  const picker = page.locator(".showcase-picker");
  const checked = picker.getByRole("checkbox", { checked: true });
  while ((await checked.count()) > 0) await checked.first().uncheck();
  await picker.getByRole("checkbox", { name: "Outer Wilds" }).check();
  await picker.getByRole("button", { name: "Guardar escaparate" }).click();
  await expect(page.locator(".showcase-game")).toHaveCount(1);
  await expect
    .poll(async () => (await demoData(page)).profile.showcase)
    .toEqual(["outer"]);
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await expect(page).toHaveURL(/\/perfil\/ajustes/);
  await expect(
    page.getByRole("heading", { name: "Ajustes", level: 1 }),
  ).toBeFocused();
  await page.getByRole("radio", { name: "Verde" }).click();
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect
    .poll(async () => (await demoData(page)).profile.avatarColor)
    .toBe("verde");
  await page.getByRole("button", { name: "Volver al perfil" }).click();
  await expect(page).toHaveURL(/\/perfil(\?|$)/);
  await expect(page.locator(".profile-hero .avatar")).toHaveClass(
    /avatar-verde/,
  );
});

test("la ficha permite registrar hoy con una nota y cambiar el estado", async ({
  page,
}) => {
  await page.goto("/juegos/disco?demo=1");
  await page
    .getByRole("button", { name: "He jugado hoy", exact: true })
    .click();
  await expect(page.getByText("Jugado hoy", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Añadir una nota de hoy" }).click();
  await page.getByLabel(/Una nota rápida de hoy/).fill("Primer interrogatorio");
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await expect
    .poll(async () =>
      (await demoData(page)).activities
        .filter((a: { gameId: string }) => a.gameId === "disco")
        .map((a: { note: string }) => a.note),
    )
    .toContain("Primer interrogatorio");
  await page
    .getByRole("button", { name: /^Estado de la partida principal/ })
    .click();
  await page.getByRole("menuitemradio", { name: "Jugando" }).click();
  await expect(
    page.getByRole("button", {
      name: /^Estado de la partida principal: Jugando/,
    }),
  ).toBeVisible();
});

test("una biblioteca vacía muestra los primeros pasos y se pueden ocultar", async ({
  page,
}) => {
  await openDemo(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "archivario-demo-v1",
      JSON.stringify({
        revision: 1,
        games: [],
        runs: [],
        activities: [],
        profile: { name: "", bio: "", timezone: "Europe/Madrid" },
      }),
    ),
  );
  await page.reload();
  const steps = page.getByRole("region", { name: "Tus primeros pasos" });
  await expect(steps).toBeVisible();
  await expect(steps.getByRole("progressbar")).toHaveAccessibleName(
    "0 de 4 pasos hechos",
  );
  await steps.getByRole("button", { name: "Añadir juego" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await steps
    .getByRole("button", { name: "Ocultar los primeros pasos" })
    .click();
  await expect(steps).toBeHidden();
  await expect
    .poll(async () => (await demoData(page)).profile.onboardingDone)
    .toBe(true);
});

test("en el móvil el botón + abre las acciones rápidas", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 640, "Solo en móvil");
  await openDemo(page);
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "Añadir" })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Registrar hoy" }),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Añadir juego" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura", exact: true }),
  ).toBeVisible();
});

test("desde la ficha se abre el diario filtrado por ese juego", async ({
  page,
}) => {
  await page.goto("/juegos/hollow?demo=1");
  await openTab(page, "Diario");
  await page.getByRole("button", { name: "Ver todos en el diario" }).click();
  await expect(page).toHaveURL(/\/diario\?juego=hollow/);
  await expect(page.locator(".journal-filters select")).toHaveValue("hollow");
  await expect(page.locator(".activity-row strong")).toHaveText([
    "Hollow Knight",
  ]);
});

test("en el resumen se edita dónde lo dejaste", async ({ page }) => {
  await page.goto("/juegos/hollow?demo=1");
  await page.getByRole("button", { name: "Editar dónde lo dejé" }).click();
  await page.getByLabel("Dónde lo dejé").fill("Frente a la puerta del Rey");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Frente a la puerta del Rey")).toBeVisible();
  await expect
    .poll(async () =>
      (await demoData(page)).runs
        .filter((r: { gameId: string }) => r.gameId === "hollow")
        .map((r: { whereLeft: string }) => r.whereLeft),
    )
    .toContain("Frente a la puerta del Rey");
});

test("la valoración se elige con estrellas y medias", async ({ page }) => {
  await page.goto("/juegos/disco?demo=1");
  await page.getByRole("button", { name: "Editar juego", exact: true }).click();
  const stars = page.getByRole("slider", { name: "Tu valoración" });
  await expect(stars).toHaveAttribute("aria-valuetext", "Sin valorar");
  // Mitad izquierda de la octava estrella: 7,5.
  const eighth = stars.locator(".rating-star").nth(7);
  const box = (await eighth.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2);
  await expect(stars).toHaveAttribute("aria-valuenow", "7.5");
  await stars.press("ArrowRight");
  await expect(stars).toHaveAttribute("aria-valuetext", "8 de 10");
  await page
    .getByRole("button", { name: "Guardar ficha", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await demoData(page)).games?.find(
          (g: { id: string }) => g.id === "disco",
        )?.rating,
    )
    .toBe(8);
});

test("se valora desde la cabecera de la ficha", async ({ page }) => {
  await page.goto("/juegos/disco?demo=1");
  const stars = page.getByRole("slider", { name: "Tu valoración" });
  await stars.focus();
  await stars.press("End");
  await stars.press("ArrowLeft");
  await expect(stars).toHaveAttribute("aria-valuetext", "9,5 de 10");
  await expect
    .poll(
      async () =>
        (await demoData(page)).games?.find(
          (g: { id: string }) => g.id === "disco",
        )?.rating,
    )
    .toBe(9.5);
});

test("la biblioteca se puede ver como lista y se recuerda", async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.locator(".game-row").first()).toBeVisible();
  await expect(page.locator(".game-card")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".game-row").first()).toBeVisible();
  const row = page.locator(".game-row").filter({ hasText: "Disco Elysium" });
  await row.getByRole("button", { name: /^Estado de Disco Elysium/ }).click();
  await page.getByRole("menuitemradio", { name: "Jugando" }).click();
  await expect(
    row.getByRole("button", { name: /^Estado de Disco Elysium: Jugando/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Portadas", exact: true }).click();
  await expect(page.locator(".game-card").first()).toBeVisible();
});

test("el estado de una partida se elige con el menú de colores", async ({
  page,
}) => {
  await page.goto("/juegos/disco?demo=1");
  await openTab(page, "Partidas");
  await page
    .getByRole("button", { name: "Gestionar partidas", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: /^Estado de esta partida/ })
    .first()
    .click();
  await page.getByRole("menuitemradio", { name: "Completado" }).click();
  await expect(
    dialog.getByRole("button", { name: /^Estado de esta partida: Completado/ }),
  ).toHaveCount(1);
  await expect(dialog).toBeVisible();
});

test("la zona horaria se busca por ciudad", async ({ page }) => {
  await page.goto("/perfil/ajustes?demo=1");
  const zone = page.getByRole("combobox", { name: "Zona horaria" });
  await zone.click();
  await zone.fill("bogo");
  await page.getByRole("option", { name: /^Bogota/ }).click();
  await expect(zone).toHaveValue("Bogota · America");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect
    .poll(async () => (await demoData(page)).profile.timezone)
    .toBe("America/Bogota");
});

test("el calendario muestra portadas y el aviso no tapa el buscador", async ({
  page,
}) => {
  await page.goto("/calendario?demo=1");
  await expect(
    page.locator(".calendar-day.today .calendar-covers img").first(),
  ).toBeVisible();
  test.skip((page.viewportSize()?.width ?? 1440) <= 640, "Solo en escritorio");
  await page.goto("/juegos/disco?demo=1");
  await page
    .getByRole("button", { name: "He jugado hoy", exact: true })
    .click();
  const toast = page.locator(".toast");
  await expect(toast).toBeVisible();
  const box = (await toast.boundingBox())!;
  expect(box.y).toBeGreaterThan((page.viewportSize()?.height ?? 900) / 2);
});

test("completar un juego lo celebra y lleva a la reseña", async ({ page }) => {
  await page.goto("/juegos/disco?demo=1");
  await page
    .getByRole("button", { name: /^Estado de la partida principal/ })
    .click();
  await page.getByRole("menuitemradio", { name: "Completado" }).click();
  await expect(
    page.getByRole("heading", { name: "¡Has completado Disco Elysium!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Escribir la reseña" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/#resena$/);
  await expect(
    page.getByRole("heading", { name: "Mi reseña", exact: true }),
  ).toBeVisible();
});

test("los ajustes se dividen en secciones con índice", async ({ page }) => {
  await page.goto("/perfil/ajustes?demo=1");
  const index = page.getByRole("navigation", {
    name: "Secciones de los ajustes",
  });
  for (const name of [
    "Perfil",
    "Apariencia",
    "Copia de seguridad",
    "Importar juegos",
    "Cuenta",
  ])
    await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
  await index.getByRole("link", { name: "Cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "Cuenta", exact: true }),
  ).toBeInViewport();
});

test("añadir un juego a mano: dos preguntas y añadir otro", async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Añadir juego", exact: true }).click();
  await page.getByLabel("Buscar un juego").fill("Tunic");
  await page.getByRole("button", { name: "Añádelo a mano" }).click();
  // El título se toma de lo que habías escrito en la búsqueda.
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue("Tunic");
  await page.getByLabel("Otra plataforma").fill("Steam Deck");
  await page.getByLabel("Otra plataforma").press("Enter");
  await expect(
    page.getByRole("button", { name: "Steam Deck", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("radio", { name: /^Lo quiero/ }).click();
  await page.getByRole("button", { name: "Añadir a mi biblioteca" }).click();
  await expect(page.getByText("ya está en tu biblioteca")).toBeVisible();
  const tunic = (await demoData(page)).games.find(
    (g: { title: string }) => g.title === "Tunic",
  );
  expect(tunic).toMatchObject({ wishlist: true });
  expect(tunic.platforms).toContain("Steam Deck");
  await page.getByRole("button", { name: "Añadir otro juego" }).click();
  await expect(page.getByLabel("Buscar un juego")).toBeVisible();
  await page.getByRole("button", { name: "Añádelo a mano" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Sin plataforma");
  for (const chip of await page
    .getByRole("dialog")
    .locator(".choice-chips button[aria-pressed=true]")
    .all())
    await chip.click();
  await page.getByRole("button", { name: "Añadir a mi biblioteca" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Elige al menos una plataforma.",
  );
});

test("la celebración deja valorar, cambiar la fecha y deshacer", async ({
  page,
}) => {
  await page.goto("/juegos/disco?demo=1");
  await page
    .getByRole("button", { name: /^Estado de la partida principal/ })
    .click();
  await page.getByRole("menuitemradio", { name: "Completado" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Lo empezaste");
  const stars = dialog.getByRole("slider", { name: "Tu valoración" });
  await stars.focus();
  await stars.press("End");
  await expect
    .poll(
      async () =>
        (await demoData(page)).games?.find(
          (g: { id: string }) => g.id === "disco",
        )?.rating,
    )
    .toBe(10);
  await dialog
    .getByRole("button", { name: "No, aún no lo he terminado" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /^Estado de la partida principal: Pendiente/,
    }),
  ).toBeVisible();
  // «No volver a mostrar» la desactiva para las siguientes.
  await page
    .getByRole("button", { name: /^Estado de la partida principal/ })
    .click();
  await page.getByRole("menuitemradio", { name: "Completado" }).click();
  await page.getByLabel("No volver a mostrar esta celebración").check();
  await page.getByRole("button", { name: "Ahora no" }).click();
  await expect
    .poll(async () => (await demoData(page)).profile.celebrate)
    .toBe(false);
});

test("los ajustes avisan de cambios sin guardar y muestran el aviso en su sección", async ({
  page,
}) => {
  await page.goto("/perfil/ajustes?demo=1");
  const perfil = page.getByRole("region", { name: "Perfil", exact: true });
  await expect(
    perfil.getByRole("button", { name: "Guardar perfil" }),
  ).toBeDisabled();
  await perfil.getByLabel("Nombre").fill("Sam");
  await perfil.getByRole("radio", { name: "Azul" }).click();
  await expect(perfil.getByText("Tienes cambios sin guardar.")).toBeVisible();
  await perfil.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(perfil.getByText("Perfil guardado.")).toBeVisible();
  await expect
    .poll(async () => (await demoData(page)).profile)
    .toMatchObject({ name: "Sam", avatarColor: "azul" });
  await expect(perfil.getByText("Tienes cambios sin guardar.")).toHaveCount(0);
});
