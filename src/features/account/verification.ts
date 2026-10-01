// Las cuentas creadas a partir de esta fecha deben confirmar su correo para
// usar el catálogo de IGDB. Las anteriores siguen funcionando igual.
export const EMAIL_VERIFICATION_SINCE = Date.parse(
  process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_SINCE ?? "2026-10-03T00:00:00Z",
);
export function needsVerification(
  emailVerified: boolean | undefined,
  creationTime: string | undefined,
) {
  if (emailVerified) return false;
  const created = creationTime ? Date.parse(creationTime) : NaN;
  return !Number.isNaN(created) && created >= EMAIL_VERIFICATION_SINCE;
}
