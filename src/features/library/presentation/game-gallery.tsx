"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, type ApiRequest } from "./shared";
import { fetchCatalogDetails } from "./catalog-details-cache";
export function GameGallery({
  id,
  request,
  demo,
  cover,
}: {
  id?: number;
  request: ApiRequest;
  demo: boolean;
  cover?: string;
}) {
  const [images, setImages] = useState<string[]>([]),
    [opened, setOpened] = useState<string>(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id || demo) return;
    let active = true;
    setError("");
    fetchCatalogDetails(request, id)
      .then((d) => {
        if (active) setImages(d.screenshots ?? []);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, demo, request, retry]);
  return (
    <section className="game-section game-gallery">
      <h2>Imágenes del juego</h2>
      {cover && (
        <Button
          variant="secondary"
          onClick={() => setOpened(cover.replace("/t_cover_big/", "/t_1080p/"))}
        >
          Ver portada completa
        </Button>
      )}
      <div className="gallery-grid">
        {images.map((src, i) => (
          <button
            key={src}
            aria-label={"Ampliar captura " + (i + 1)}
            onClick={() => setOpened(src)}
          >
            <img
              src={src}
              alt={"Captura del juego " + (i + 1)}
              loading="lazy"
              decoding="async"
              width={1920}
              height={1080}
            />
          </button>
        ))}
      </div>
      {demo && (
        <p className="muted">
          Inicia sesión para consultar las capturas de IGDB.
        </p>
      )}
      {!demo && !error && !images.length && (
        <p className="muted">No hay capturas disponibles.</p>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)}>
            Reintentar imágenes
          </button>
        </p>
      )}
      {opened && (
        <Modal
          title="Imagen completa"
          description="Imagen de IGDB a tamaño completo."
          onClose={() => setOpened(undefined)}
        >
          <img
            className="gallery-full"
            src={opened}
            alt="Imagen del juego ampliada"
          />
        </Modal>
      )}
    </section>
  );
}
