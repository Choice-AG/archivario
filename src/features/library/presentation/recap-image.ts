"use client";
// Dibuja el resumen de un año o de un mes como una imagen vertical
// (1080 × 1350) para guardarla o compartirla. Todo ocurre en el navegador.

export type RecapData = {
  eyebrow: string;
  title: string;
  subtitle: string;
  stats: [string, string][];
  heading: string;
  games: { title: string; cover?: string; detail: string }[];
  lines: string[];
};

const W = 1080,
  H = 1350,
  PAD = 60;
const FONT = '"Segoe UI", Arial, sans-serif';
const INK = "#f2efff",
  SOFT = "#c5c8d8",
  MUTED = "#9096ad",
  ACCENT = "#b49cfa";

function loadImage(src: string) {
  return new Promise<HTMLImageElement | undefined>((resolve) => {
    const img = new Image();
    // Las portadas de IGDB y Steam permiten usarse en un lienzo.
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    const timer = setTimeout(() => resolve(undefined), 6000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(undefined);
    };
    img.src = src;
  });
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Recorta el texto con «…» para que quepa en el ancho dado.
function fit(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > width)
    t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 400,
  width = W - PAD * 2,
) {
  ctx.font = weight + " " + size + "px " + FONT;
  ctx.fillStyle = color;
  ctx.fillText(fit(ctx, value, width), x, y);
}

// Si una portada no se deja usar en el lienzo, se repite sin portadas.
export async function drawRecap(data: RecapData): Promise<Blob> {
  try {
    return await render(data, true);
  } catch {
    return render(data, false);
  }
}

async function render(data: RecapData, covers: boolean): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";
  // Fondo oscuro con un halo violeta, como la app.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0c0e16");
  bg.addColorStop(1, "#1b1530");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 120, 140, 20, W - 120, 140, 520);
  glow.addColorStop(0, "rgba(124, 58, 237, 0.35)");
  glow.addColorStop(1, "rgba(124, 58, 237, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.font = "700 28px " + FONT;
  ctx.fillStyle = ACCENT;
  ctx.letterSpacing = "6px";
  ctx.fillText(data.eyebrow.toUpperCase(), PAD, 110);
  ctx.letterSpacing = "0px";
  text(ctx, data.title, PAD, 210, 92, INK, 700);
  text(ctx, data.subtitle, PAD, 268, 34, SOFT);

  // Cifras en una cuadrícula de dos columnas.
  const boxW = (W - PAD * 2 - 24) / 2,
    boxH = 160;
  data.stats.slice(0, 4).forEach(([value, label], i) => {
    const x = PAD + (i % 2) * (boxW + 24),
      y = 320 + Math.floor(i / 2) * (boxH + 24);
    rounded(ctx, x, y, boxW, boxH, 28);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fill();
    text(ctx, value, x + 32, y + 88, 68, INK, 700, boxW - 64);
    text(ctx, label, x + 32, y + 132, 28, SOFT, 400, boxW - 64);
  });

  // Portadas de lo más jugado.
  const games = data.games.slice(0, 5);
  const top = 320 + 2 * (boxH + 24) + 40;
  if (games.length) {
    text(ctx, data.heading, PAD, top + 10, 36, INK, 600);
    const gap = 20,
      cw = (W - PAD * 2 - gap * 4) / 5,
      ch = cw * (4 / 3),
      y = top + 40;
    const images = await Promise.all(
      games.map((g) => (covers && g.cover ? loadImage(g.cover) : undefined)),
    );
    games.forEach((g, i) => {
      const x = PAD + i * (cw + gap);
      ctx.save();
      rounded(ctx, x, y, cw, ch, 16);
      ctx.clip();
      const img = images[i];
      if (img) {
        // Como «object-fit: cover».
        const scale = Math.max(cw / img.width, ch / img.height);
        const w = img.width * scale,
          h = img.height * scale;
        ctx.drawImage(img, x + (cw - w) / 2, y + (ch - h) / 2, w, h);
      } else {
        ctx.fillStyle = "#272238";
        ctx.fillRect(x, y, cw, ch);
        ctx.font = "600 22px " + FONT;
        ctx.fillStyle = SOFT;
        const words = g.title.split(" ");
        let line = "",
          ly = y + 44;
        for (const word of words) {
          const next = line ? line + " " + word : word;
          if (ctx.measureText(next).width > cw - 24 && line) {
            ctx.fillText(line, x + 12, ly);
            line = word;
            ly += 28;
            if (ly > y + ch - 16) break;
          } else line = next;
        }
        if (ly <= y + ch - 16)
          ctx.fillText(fit(ctx, line, cw - 24), x + 12, ly);
      }
      ctx.restore();
      text(ctx, g.detail, x, y + ch + 34, 24, SOFT, 400, cw);
    });
  }

  let ly = H - 210;
  for (const line of data.lines.slice(0, 3)) {
    text(ctx, line, PAD, ly, 30, SOFT);
    ly += 46;
  }
  text(ctx, "Archivario · Tus juegos, a tu ritmo.", PAD, H - 56, 24, MUTED);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("No se ha podido crear.")),
      "image/png",
    ),
  );
}
