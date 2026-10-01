"use client";
import { useState } from "react";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  candidatesFromCsv,
  candidatesFromSteam,
  importPlan,
  libraryFromCandidates,
  type ImportCandidate,
  type SteamGame,
} from "../domain/import-sources";
import { dateInZone, type Library } from "../domain/model";
import { plural } from "./format";
import type { ApiRequest, Execute } from "./shared";

// Importa juegos desde un CSV o desde una biblioteca pública de Steam.
export function ImportGames({
  state,
  execute,
  request,
  demo,
}: {
  state: Library;
  execute: Execute;
  request: ApiRequest;
  demo: boolean;
}) {
  const [source, setSource] = useState<"csv" | "steam">("csv"),
    [candidates, setCandidates] = useState<ImportCandidate[]>(),
    [steamGames, setSteamGames] = useState<SteamGame[]>(),
    [playedOnly, setPlayedOnly] = useState(false),
    [profile, setProfile] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState(false);
  const chosen =
    source === "steam" && steamGames
      ? candidatesFromSteam(
          playedOnly ? steamGames.filter((g) => g.minutes > 0) : steamGames,
        )
      : candidates;
  const plan = chosen ? importPlan(state, chosen) : undefined;
  const reset = () => {
    setCandidates(undefined);
    setSteamGames(undefined);
    setError("");
    setNotice("");
  };
  return (
    <section className="import-games">
      <h3>Importar juegos</h3>
      <p className="muted text-sm my-2">
        Trae tu colección desde Steam o desde una hoja de cálculo. Los juegos
        que ya tienes no se duplican.
      </p>
      <div
        className="segmented"
        role="group"
        aria-label="Origen de la importación"
      >
        {(
          [
            ["csv", "Archivo CSV"],
            ["steam", "Steam"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={source === value}
            className={source === value ? "selected" : ""}
            onClick={() => {
              setSource(value);
              reset();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {source === "csv" ? (
        <>
          <p className="muted text-xs mt-3">
            La primera fila debe tener los nombres de las columnas. Solo el
            título es obligatorio; también se reconocen plataforma, tienda,
            estado, nota y horas.
          </p>
          <label className="upload-label mt-3">
            <FileSpreadsheet size={16} /> Elegir archivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                reset();
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 2_000_000) {
                  setError("El archivo es demasiado grande (máximo 2 MB).");
                  return;
                }
                try {
                  setCandidates(candidatesFromCsv(await file.text()));
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            />
          </label>
        </>
      ) : demo ? (
        <p className="info-note mt-3">
          Inicia sesión para importar tu biblioteca de Steam.
        </p>
      ) : (
        <form
          className="steam-form"
          onSubmit={async (e) => {
            e.preventDefault();
            reset();
            setPending(true);
            try {
              const data = (await (
                await request(
                  "/api/import/steam?profile=" + encodeURIComponent(profile),
                )
              ).json()) as { games: SteamGame[] };
              setSteamGames(data.games);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            Perfil de Steam
            <input
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="URL del perfil, nombre o SteamID64"
              maxLength={120}
              required
            />
            <small>
              Tu perfil y tu lista de juegos deben ser públicos en Steam.
            </small>
          </label>
          <Button variant="secondary" disabled={pending}>
            {pending && <LoaderCircle size={15} className="animate-spin" />}
            Buscar mis juegos
          </Button>
          {steamGames && (
            <label className="checkbox-label mt-3">
              <input
                type="checkbox"
                checked={playedOnly}
                onChange={(e) => setPlayedOnly(e.target.checked)}
              />{" "}
              Solo los juegos a los que he jugado
            </label>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="accent-text text-sm mt-3">
          {notice}
        </p>
      )}
      {plan && (
        <div className="import-preview" role="status">
          <p>
            <strong>
              {plural(plan.fresh.length, "juego nuevo", "juegos nuevos")}
            </strong>
            {plan.duplicates.length > 0 &&
              " · " +
                plural(plan.duplicates.length, "ya estaba", "ya estaban") +
                " en tu biblioteca"}
            {plan.overLimit > 0 &&
              " · " +
                plural(plan.overLimit, "no cabe", "no caben") +
                " por el límite de la biblioteca"}
          </p>
          {plan.fresh.length > 0 && (
            <ul className="import-sample">
              {plan.fresh.slice(0, 8).map((c) => (
                <li key={c.title}>
                  {c.title}
                  <small>{c.platforms.join(", ")}</small>
                </li>
              ))}
              {plan.fresh.length > 8 && (
                <li className="muted">y {plan.fresh.length - 8} más…</li>
              )}
            </ul>
          )}
          <Button
            disabled={pending || !plan.fresh.length}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                await execute({
                  type: "import",
                  policy: "skip",
                  data: libraryFromCandidates(
                    state,
                    plan.fresh,
                    new Date().toISOString(),
                    dateInZone(new Date(), state.profile.timezone),
                    () => crypto.randomUUID(),
                  ),
                });
                const count = plan.fresh.length;
                reset();
                setNotice(
                  plural(count, "juego importado", "juegos importados") +
                    ". Están como pendientes; ajusta su estado cuando quieras.",
                );
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setPending(false);
              }
            }}
          >
            Importar {plural(plan.fresh.length, "juego", "juegos")}
          </Button>
        </div>
      )}
    </section>
  );
}
