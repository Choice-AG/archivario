"use client";

// Gráficos sencillos sin librerías: columnas por mes y barras por categoría.
// Una sola serie, sin leyenda: el título dice qué se mide. Cada columna
// muestra su valor al pasar el ratón o al enfocarla, y hay una tabla.

export type ColumnDatum = {
  key: string;
  label: string;
  full: string;
  value: number;
};

export function ColumnChart({
  title,
  data,
  format,
}: {
  title: string;
  data: ColumnDatum[];
  format: (value: number) => string;
}) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const peak = data.findIndex((d) => d.value === max && max > 0);
  return (
    <figure className="chart" aria-label={title}>
      <ol className="column-chart">
        {data.map((d, i) => {
          const height = max ? (d.value / max) * 100 : 0;
          const text = d.full + ": " + (d.value ? format(d.value) : "nada");
          return (
            <li key={d.key}>
              <span
                className="column-hit"
                role="img"
                tabIndex={0}
                aria-label={text}
                title={text}
              >
                <span className="column-track">
                  {i === peak && (
                    <span
                      className="column-value"
                      style={{ bottom: height + "%" }}
                      aria-hidden="true"
                    >
                      {format(d.value)}
                    </span>
                  )}
                  <span
                    className="column-bar"
                    style={{ height: d.value ? Math.max(height, 2) + "%" : 0 }}
                  />
                </span>
                <span className="chart-tip" aria-hidden="true">
                  {text}
                </span>
              </span>
              <span className="column-label" aria-hidden="true">
                {d.label}
              </span>
            </li>
          );
        })}
      </ol>
      <ChartTable
        rows={data.map((d) => [d.full, d.value ? format(d.value) : "—"])}
      />
    </figure>
  );
}

export function BarList({
  title,
  items,
  format,
}: {
  title: string;
  items: { name: string; value: number }[];
  format: (value: number) => string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <figure className="chart" aria-label={title}>
      <ul className="bar-list">
        {items.map((item) => (
          <li key={item.name}>
            <span className="bar-name">{item.name}</span>
            <span className="bar-track" aria-hidden="true">
              <span
                className="bar-fill"
                style={{ width: (max ? (item.value / max) * 100 : 0) + "%" }}
              />
            </span>
            <span className="bar-value">{format(item.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function ChartTable({ rows }: { rows: [string, string][] }) {
  return (
    <details className="chart-table">
      <summary>Ver como tabla</summary>
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
