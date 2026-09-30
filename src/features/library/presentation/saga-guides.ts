"use client";
import { useEffect, useState } from "react";
import type { Saga } from "../domain/model";
// Las guías (~40 KB) se cargan bajo demanda para no inflar el bundle inicial.
let loaded: Saga[] | undefined;
let pending: Promise<Saga[]> | undefined;
function loadGuides() {
  pending ??= import("../infrastructure/saga-guides.json").then(
    (m) => (loaded = m.default as Saga[]),
  );
  return pending;
}
export function useSagaGuides(enabled = true) {
  const [guides, setGuides] = useState<Saga[] | undefined>(loaded);
  useEffect(() => {
    if (!enabled || guides) return;
    let active = true;
    loadGuides().then((g) => {
      if (active) setGuides(g);
    });
    return () => {
      active = false;
    };
  }, [enabled, guides]);
  return guides;
}
