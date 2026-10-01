"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, type ApiRequest } from "./shared";
import { useCatalogDetails } from "./use-api";
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
  const [opened, setOpened] = useState<string>();
  const details = useCatalogDetails(request, id, !demo);
  const images = details.data?.screenshots ?? [],
    error = details.error;
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
      {!demo && !error && !details.loading && !images.length && (
        <p className="muted">No hay capturas disponibles.</p>
      )}
      {error && (
        <p role="alert">
          {error} <button onClick={details.retry}>Reintentar imágenes</button>
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
