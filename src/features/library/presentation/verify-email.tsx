"use client";
import { useState } from "react";
import { sendEmailVerification, type User } from "firebase/auth";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { needsVerification } from "@/features/account/verification";

// Aviso para cuentas nuevas sin correo confirmado: el catálogo de IGDB queda
// bloqueado hasta confirmarlo, el resto de la app funciona con normalidad.
export function VerifyEmailBanner({ user }: { user: User }) {
  const [, refresh] = useState(0),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  if (!needsVerification(user.emailVerified, user.metadata.creationTime))
    return null;
  return (
    <div className="verify-banner" role="status">
      <MailCheck size={18} aria-hidden="true" />
      <span>
        Confirma tu correo ({user.email}) para buscar juegos en el catálogo.
        {message && <small>{message}</small>}
      </span>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await sendEmailVerification(user);
            setMessage("Te hemos enviado otro correo.");
          } catch {
            setMessage("Espera unos minutos antes de pedir otro correo.");
          } finally {
            setPending(false);
          }
        }}
      >
        Reenviar
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await user.reload();
            // Token nuevo para que el servidor vea el correo confirmado.
            await user.getIdToken(true);
            if (!user.emailVerified)
              setMessage("Todavía no aparece como confirmado.");
            refresh((n) => n + 1);
          } finally {
            setPending(false);
          }
        }}
      >
        Ya lo he confirmado
      </Button>
    </div>
  );
}
