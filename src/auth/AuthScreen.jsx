import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Btn, Field, TInput } from "../components/ui/atoms";

export function AuthScreen() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setInfo("Cuenta creada. Revisa tu email para confirmar la cuenta antes de iniciar sesión.");
        }
      }
    } catch (err) {
      setError(err.message || "Ha ocurrido un error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-app mt-auth-screen">
      <form onSubmit={submit} className="mt-card mt-auth-card">
        <div>
          <div className="mt-display font-bold text-xl">Archivario</div>
          <p className="mt-ink-soft text-sm">{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</p>
        </div>

        <Field label="Email">
          <TInput type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contraseña" hint={mode === "signup" ? "Mínimo 6 caracteres" : undefined}>
          <TInput type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>

        {error && <p className="text-xs" style={{ color: "var(--stamp)" }}>{error}</p>}
        {info && <p className="text-xs mt-accent-text">{info}</p>}

        <Btn variant="primary" type="submit" disabled={loading}>
          {loading ? "Cargando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </Btn>

        <button
          type="button"
          className="text-xs mt-ink-soft underline w-fit"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setError("");
            setInfo("");
          }}
        >
          {mode === "login" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </form>
    </div>
  );
}
