import { Fragment, type ReactNode } from "react";

// Formato básico para reseñas y notas: párrafos, saltos de línea, **negrita**,
// *cursiva*, listas con «-» o «1.» y enlaces [texto](https://…). Genera
// elementos de React (nunca HTML), así que el texto no puede inyectar código.

const INLINE =
  /(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*)\*)|(_([^_\s][^_]*)_)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0,
    i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = key + "-" + i++;
    if (m[2]) out.push(<strong key={k}>{m[2]}</strong>);
    else if (m[4] || m[6]) out.push(<em key={k}>{m[4] ?? m[6]}</em>);
    else if (m[8])
      out.push(
        <a
          key={k}
          href={m[9]}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {m[8]}
        </a>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function lines(text: string, key: string) {
  return text.split("\n").map((line, i, all) => (
    <Fragment key={key + "-l" + i}>
      {inline(line, key + "-l" + i)}
      {i < all.length - 1 && <br />}
    </Fragment>
  ));
}

export function Markdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, b) => {
        const rows = block.split("\n");
        const bullet = rows.every((r) => /^\s*[-*•]\s+/.test(r));
        const numbered = rows.every((r) => /^\s*\d+[.)]\s+/.test(r));
        if (bullet || numbered) {
          const List = numbered ? "ol" : "ul";
          return (
            <List key={b}>
              {rows.map((r, i) => (
                <li key={i}>
                  {inline(r.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), b + "-" + i)}
                </li>
              ))}
            </List>
          );
        }
        return <p key={b}>{lines(block, String(b))}</p>;
      })}
    </div>
  );
}

export const markdownHint =
  "Admite **negrita**, *cursiva*, listas con guiones y enlaces [texto](https://…).";
