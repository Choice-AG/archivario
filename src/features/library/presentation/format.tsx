import { statuses, type Status } from "../domain/model";

const dateFormat = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
// Fechas locales "AAAA-MM-DD" mostradas como "1 oct 2026".
export function formatDate(date: string | undefined) {
  if (!date) return "";
  const parsed = new Date(date + "T00:00:00Z");
  return isNaN(parsed.getTime()) ? date : dateFormat.format(parsed);
}
export function DateText({ date }: { date: string }) {
  return <time dateTime={date}>{formatDate(date)}</time>;
}

// "1 día", "2 días"…
export function plural(n: number, one: string, many: string) {
  return n + " " + (n === 1 ? one : many);
}
export function monthLabel(date: string) {
  const text = new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date.slice(0, 7) + "-15T12:00:00Z"));
  return text[0].toLocaleUpperCase("es") + text.slice(1);
}
export function statusLabel(status: string) {
  return status ? status[0].toLocaleUpperCase("es") + status.slice(1) : status;
}
export function StatusOptions() {
  return (
    <>
      {statuses.map((s: Status) => (
        <option key={s} value={s}>
          {statusLabel(s)}
        </option>
      ))}
    </>
  );
}
