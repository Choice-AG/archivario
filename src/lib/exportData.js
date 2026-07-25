export function toCSV(items) {
  const headers = [
    "id","type","title","sagaId","status","score","tags","platform","hours",
    "currentVolume","currentChapter","season","currentEpisode",
    "startDate","endDate","releaseDate","chronoOrder","releaseOrder","priority","notes",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = items.map((it) => headers.map((h) => esc(h === "tags" ? (it.tags || []).join("|") : it[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

export function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
