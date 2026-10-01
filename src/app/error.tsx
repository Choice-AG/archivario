"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/monitoring";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error de interfaz", error.name, error.digest ?? "");
    reportError(error);
  }, [error]);
  return (
    <main className="empty-state" role="alert">
      <h1>Algo no ha ido bien.</h1>
      <p>Tus datos están a salvo. Vuelve a intentarlo o recarga la página.</p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
