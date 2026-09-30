import { expect, it } from "vitest";
import { authMessage } from "../src/features/library/presentation/login";

it("traduce los códigos de Firebase Auth a mensajes concretos", () => {
  expect(authMessage({ code: "auth/invalid-credential" }, false)).toMatch(
    /correo o la contraseña/,
  );
  expect(authMessage({ code: "auth/email-already-in-use" }, true)).toMatch(
    /Ya existe una cuenta/,
  );
  expect(authMessage({ code: "auth/weak-password" }, true)).toMatch(/8/);
  expect(authMessage(new Error("x"), true)).toMatch(/crear la cuenta/);
  expect(authMessage(undefined, false)).toMatch(/No se ha podido acceder/);
});
