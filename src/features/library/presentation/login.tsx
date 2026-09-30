"use client";
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ArrowUpRight, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientAuth } from "@/features/account/firebase-client";

export function Login({ onDemo }: { onDemo: () => void }) {
  const [signup, setSignup] = useState(false),
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
              if (signup)
                await createUserWithEmailAndPassword(
                  clientAuth(),
                  email,
                  password,
                );
              else
                await signInWithEmailAndPassword(clientAuth(), email, password);
            } catch {
              setMessage(
                "No se ha podido acceder. Revisa tus datos y la configuración de Firebase.",
              );
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
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete={signup ? "new-password" : "current-password"}
              required
            />
          </label>
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
            } catch {
              setMessage("No se ha podido enviar el correo.");
            }
          }}
        >
          Recuperar contraseña
        </Button>
        <div className="divider" />
        <Button variant="secondary" onClick={onDemo}>
          Explorar la demostración <ArrowUpRight size={16} />
        </Button>
      </section>
    </main>
  );
}
