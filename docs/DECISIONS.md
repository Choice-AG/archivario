# Decisiones conservadas

- Nombre: Archivario. Español, oscuro carbón/navy, violeta, portadas protagonistas.
- Next App Router + TypeScript + Tailwind + componentes shadcn/ui de código local (Radix Dialog, Button con CVA).
- Firebase Authentication y Firestore en Spark; Route Handlers con Admin SDK. Sin Cloud Functions para operaciones normales.
- Alojamiento elegido: Vercel Hobby para uso personal no comercial y Firebase Spark. No activar facturación. Se descarta App Hosting por exigir Blaze.
- Privado por defecto; notas siempre privadas. Sin funciones sociales todavía.
- Actividad como fecha local explícita. No convertir al cambiar de zona horaria.
- Sin cronómetro, duración de sesiones ni horas contabilizadas.
- Tiempo de finalización solo manual, por partida; nunca derivado del diario.
- Estados: pendiente, jugando, en pausa, completado, abandonado.
- Finalización independiente: sin especificar, historia, 100%.
- Partidas y rejugadas conservan historial; una principal determina el estado.
- Múltiples plataformas y tiendas sin duplicar juego.
- Valoración general 1–10 con incrementos 0,5.
- Máximo tres próximos juegos; sin presión, rachas ni fechas límite.
- Importación con formato v1 y vista previa obligatoria en UI. Sustituir biblioteca es una decisión explícita; política por defecto: omitir juegos duplicados completos.
- Demostración local claramente marcada cuando no hay configuración Firebase.
- Primer adaptador Firestore usa agregado acotado por usuario. Migración a colecciones prevista antes de bibliotecas grandes.
- Publicada en Vercel Hobby con Firebase Spark (ver FREE-HOSTING.md).

- Avatares con iniciales para evitar depender de Cloud Storage. Credenciales de Vercel solo en variables privadas del servidor.
- Sin TTL de Firestore (requiere facturación): limpieza ocasional de la caché desde el servidor.
- Portadas con `<img>` en lugar de next/image para no gastar la cuota de optimización de Vercel Hobby.
- El dominio no depende de Zod; validation.ts comprueba en compilación que esquemas y tipos coinciden.
- Tema claro además del oscuro: sigue la preferencia del sistema salvo que se elija otro en Ajustes. Los colores de globals.css son variables (`--c-*`) con su versión clara calculada; lo que va sobre portadas e ilustraciones conserva la paleta oscura.
