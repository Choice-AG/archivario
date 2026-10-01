import { test, expect, type Page } from "@playwright/test";

const authEmulator = "http://127.0.0.1:9099";
const project = "demo-archivario";

async function signUp(page: Page, email: string, password = "contraseña-1") {
  await page.goto("/");
  await page.getByRole("button", { name: "Crear una cuenta" }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu próxima aventura empieza aquí." }),
  ).toBeVisible();
}
const uniqueEmail = () =>
  "prueba-" +
  Date.now() +
  "-" +
  Math.round(Math.random() * 1e6) +
  "@example.com";
async function addGame(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Añadir juego", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Añádelo a mano" }).click();
  await page.getByLabel("Título", { exact: true }).fill(title);
  const pc = page
    .getByRole("dialog")
    .getByRole("button", { name: "PC", exact: true });
  if ((await pc.getAttribute("aria-pressed")) !== "true") await pc.click();
  await page.getByRole("button", { name: "Añadir a mi biblioteca" }).click();
  await page.getByRole("button", { name: "Listo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Abrir " + title, exact: true }),
  ).toBeVisible();
}

test.beforeAll(async ({ request }) => {
  // Empieza con los emuladores vacíos.
  await request.delete(
    `${authEmulator}/emulator/v1/projects/${project}/accounts`,
  );
  await request.delete(
    `http://127.0.0.1:8085/emulator/v1/projects/${project}/databases/(default)/documents`,
  );
});

test("registro, confirmación del correo y biblioteca guardada en Firestore", async ({
  page,
  request,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await expect(page.locator(".verify-banner")).toContainText(email);
  // Una cuenta nueva ve la bienvenida con las tres formas de empezar.
  await expect(
    page.getByRole("heading", { name: "Empieza tu biblioteca" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Importar desde Steam/ }),
  ).toBeEnabled();
  // El emulador expone los enlaces de verificación enviados.
  const { oobCodes } = await (
    await request.get(
      `${authEmulator}/emulator/v1/projects/${project}/oobCodes`,
    )
  ).json();
  const link = oobCodes.find(
    (c: { email: string; requestType: string }) =>
      c.email === email && c.requestType === "VERIFY_EMAIL",
  ).oobLink;
  await request.get(link);
  await page.getByRole("button", { name: "Ya lo he confirmado" }).click();
  await expect(page.locator(".verify-banner")).toHaveCount(0);

  await addGame(page, "Juego en la nube");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Abrir Juego en la nube", exact: true }),
  ).toBeVisible();
});

test("las cuentas no ven la biblioteca de otras", async ({ browser }) => {
  const a = await browser.newPage();
  await signUp(a, uniqueEmail());
  await addGame(a, "Solo de Ana");
  const b = await browser.newPage();
  await signUp(b, uniqueEmail());
  await expect(
    b.getByRole("button", { name: "Abrir Solo de Ana", exact: true }),
  ).toHaveCount(0);
});

test("dos pestañas se sincronizan y un cambio antiguo no pisa uno nuevo", async ({
  context,
}) => {
  const first = await context.newPage();
  await signUp(first, uniqueEmail());
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByRole("heading", { name: "Tu próxima aventura empieza aquí." }),
  ).toBeVisible();
  await addGame(first, "Desde la primera");
  // La segunda pestaña aún tiene la revisión anterior: su cambio choca,
  // se recarga el estado y ambos juegos quedan guardados.
  await second
    .getByRole("button", { name: "Añadir juego", exact: true })
    .first()
    .click();
  await second.getByRole("button", { name: "Añádelo a mano" }).click();
  await second.getByLabel("Título", { exact: true }).fill("Desde la segunda");
  const pc = second
    .getByRole("dialog")
    .getByRole("button", { name: "PC", exact: true });
  if ((await pc.getAttribute("aria-pressed")) !== "true") await pc.click();
  await second.getByRole("button", { name: "Añadir a mi biblioteca" }).click();
  await expect(
    second.getByText(/cambió en otro dispositivo/).first(),
  ).toBeVisible();
  // Al volver a guardar sobre la versión nueva, se conservan los dos.
  await second.getByRole("button", { name: "Añadir a mi biblioteca" }).click();
  await second.getByRole("button", { name: "Listo", exact: true }).click();
  for (const title of ["Desde la primera", "Desde la segunda"])
    await expect(
      second.getByRole("button", { name: "Abrir " + title, exact: true }),
    ).toBeVisible();
});

test("sin conexión guarda los cambios y los envía al volver", async ({
  page,
  context,
}) => {
  await signUp(page, uniqueEmail());
  await addGame(page, "Antes del túnel");
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await page
    .getByRole("button", { name: /^Estado de Antes del túnel:/ })
    .click();
  await page
    .getByRole("menuitemradio", { name: "Completado", exact: true })
    .click();
  await expect(page.locator(".offline-banner")).toContainText("1 pendiente");
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator(".offline-banner")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: /^Estado de Antes del túnel: Completado/,
    }),
  ).toBeVisible();
});

test("una contraseña incorrecta muestra un mensaje claro y salir borra la copia local", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await page.getByRole("button", { name: "Salir" }).click();
  const leftovers = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("archivario-cache")),
  );
  expect(leftovers).toEqual([]);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("otra-cosa-1");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(
    page.getByText("El correo o la contraseña no son correctos."),
  ).toBeVisible();
});
