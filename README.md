# Archivario

Tu archivo personal para trackear videojuegos, manga, anime y películas — con sagas/franquicias, backlog priorizado, línea temporal, dashboard y modo oscuro.

## Arrancar en local

```bash
npm install
npm run dev
```

Abre la URL que te muestre la terminal (normalmente `http://localhost:5173`).

## Notas técnicas

- **Persistencia:** los datos se guardan en `localStorage` del navegador (clave `archivario:*`). No hay backend ni base de datos: todo vive en tu máquina/navegador.
- **Backup:** desde "Ajustes y backup" puedes exportar/importar todo en JSON, o exportar un CSV de solo lectura.
- **Stack:** React + Vite + Tailwind (utilidades de layout) + una capa de CSS propia con variables (`src/index.css`) para la identidad visual + lucide-react para iconos.
- **Estructura:**
  - `src/App.jsx` — toda la lógica y componentes (modelo de datos, vistas, formularios)
  - `src/index.css` — sistema de diseño (paleta, tipografía, componentes visuales)
  - `src/main.jsx` — punto de entrada

## Build de producción

```bash
npm run build
npm run preview
```
