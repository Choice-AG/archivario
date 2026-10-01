"use client";
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ArrowUpRight, Eye, EyeOff, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientAuth } from "@/features/account/firebase-client";

// Mensajes concretos para los códigos de error más habituales de Firebase Auth.
export function authMessage(error: unknown, signup: boolean) {
  const code = (error as { code?: string })?.code ?? "";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  )
    return "El correo o la contraseña no son correctos.";
  if (code === "auth/email-already-in-use")
    return "Ya existe una cuenta con este correo. Prueba a entrar.";
  if (code === "auth/weak-password")
    return "La contraseña es demasiado débil: usa al menos 8 caracteres.";
  if (code === "auth/invalid-email")
    return "El correo no tiene un formato válido.";
  if (code === "auth/too-many-requests")
    return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  if (code === "auth/network-request-failed")
    return "Sin conexión. Revisa tu red e inténtalo de nuevo.";
  return signup
    ? "No se ha podido crear la cuenta. Inténtalo de nuevo."
    : "No se ha podido acceder. Inténtalo de nuevo.";
}

export function Login({ onDemo }: { onDemo: () => void }) {
  const [signup, setSignup] = useState(false),
    [showPassword, setShowPassword] = useState(false),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <main className="login-screen">
      <div className="login-art">
        <Gamepad2 size={60} />
        <h1>
          Mil historias.
          <br />
          <span>Tu propia partida.</span>
        </h1>
        <p>
          Un lugar para los mundos que visitas
          <br />y los que todavía te esperan.
        </p>
      </div>
      <section className="login-form">
        <div className="brand">
          <Gamepad2 /> Archivario
        </div>
        <h2>
          {signup
            ? "Tu próximo viaje empieza aquí."
            : "Qué bien volver a verte."}
        </h2>
        <p className="muted">Una biblioteca privada. Todos tus dispositivos.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setMessage("");
            const password = String(
              new FormData(e.currentTarget).get("password"),
            );
            try {
              if (signup) {
                const { user } = await createUserWithEmailAndPassword(
                  clientAuth(),
                  email,
                  password,
                );
                // Si falla el envío, el aviso de la app permite reenviarlo.
                await sendEmailVerification(user).catch(() => {});
              } else
                await signInWithEmailAndPassword(clientAuth(), email, password);
            } catch (error) {
              setMessage(authMessage(error, signup));
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="field">
            {/* El botón queda fuera de la etiqueta para que el campo se llame
                solo «Contraseña». */}
            <label htmlFor="login-password">Contraseña</label>
            <span className="password-field">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                minLength={8}
                autoComplete={signup ? "new-password" : "current-password"}
                aria-describedby={signup ? "password-hint" : undefined}
                required
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
            {signup && <small id="password-hint">Al menos 8 caracteres.</small>}
          </div>
          <Button disabled={pending} className="w-full">
            {signup ? "Crear cuenta" : "Entrar"}
          </Button>
        </form>
        <p role="status" className="muted">
          {message}
        </p>
        <Button variant="ghost" onClick={() => setSignup(!signup)}>
          {signup ? "Ya tengo cuenta" : "Crear una cuenta"}
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            if (!email.trim()) {
              setMessage("Escribe tu correo en el formulario.");
              return;
            }
            try {
              await sendPasswordResetEmail(clientAuth(), email.trim());
              setMessage(
                "Si existe una cuenta, recibirás instrucciones por correo.",
              );
            } catch (error) {
              setMessage(
                (error as { code?: string })?.code === "auth/invalid-email"
                  ? "El correo no tiene un formato válido."
                  : "No se ha podido enviar el correo.",
              );
            }
          }}
        >
          Recuperar contraseña
        </Button>
        <div className="divider" />
        <Button variant="secondary" onClick={onDemo}>
          Explorar la demostración <ArrowUpRight size={16} />
        </Button>
        <p className="muted text-xs demo-hint">
          Sin cuenta: prueba con juegos de ejemplo. Lo que cambies se guarda
          solo en este navegador.
        </p>
      </section>
    </main>
  );
}
