"use client";
import { useEffect, useState } from "react";
import { Download, ImageIcon, LoaderCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecapData } from "./recap-image";

// Crea la imagen al pedirla (el dibujo se descarga solo entonces), la
// enseña y deja compartirla o guardarla.
export function ShareRecap({
  build,
  filename,
  label = "Guardar como imagen",
}: {
  build: () => RecapData;
  filename: string;
  label?: string;
}) {
  const [image, setImage] = useState<{ url: string; blob: Blob }>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  useEffect(() => () => image && URL.revokeObjectURL(image.url), [image]);
  const file = image && new File([image.blob], filename, { type: "image/png" });
  const canShare =
    !!file &&
    typeof navigator !== "undefined" &&
    !!navigator.canShare?.({ files: [file] });
  if (!image)
    return (
      <div className="recap-share">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError("");
            try {
              const { drawRecap } = await import("./recap-image");
              const blob = await drawRecap(build());
              setImage({ blob, url: URL.createObjectURL(blob) });
            } catch (e) {
              setError((e as Error).message || "No se ha podido crear.");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <ImageIcon size={16} />
          )}{" "}
          {label}
        </Button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  return (
    <div className="recap-share recap-ready">
      {/* La imagen ya resume lo que hay escrito alrededor. */}
      <img src={image.url} alt="Vista previa de la imagen" />
      <div className="form-actions">
        {canShare && (
          <Button
            onClick={() =>
              navigator
                .share({ files: [file!], title: filename })
                .catch(() => {})
            }
          >
            <Share2 size={16} /> Compartir
          </Button>
        )}
        <Button variant={canShare ? "secondary" : "default"} asChild>
          <a href={image.url} download={filename}>
            <Download size={16} /> Descargar
          </a>
        </Button>
        <Button variant="ghost" onClick={() => setImage(undefined)}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
