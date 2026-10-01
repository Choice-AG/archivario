import { expect, it } from "vitest";
import {
  EMAIL_VERIFICATION_SINCE,
  needsVerification,
} from "../src/features/account/verification";

it("solo pide confirmar el correo a cuentas nuevas sin verificar", () => {
  const after = new Date(EMAIL_VERIFICATION_SINCE + 1000).toUTCString();
  const before = new Date(EMAIL_VERIFICATION_SINCE - 86400000).toUTCString();
  expect(needsVerification(false, after)).toBe(true);
  expect(needsVerification(true, after)).toBe(false);
  expect(needsVerification(false, before)).toBe(false);
  expect(needsVerification(false, undefined)).toBe(false);
});
