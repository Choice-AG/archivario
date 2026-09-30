# Arquitectura de Archivario

## Dependencias

Presentación React → contratos y comandos → casos de uso → dominio.

Los adaptadores Firebase implementan LibraryRepository. El contenedor de servidor construye LibraryService con FirebaseLibraryRepository. El dominio no importa Firebase, React, Next ni Zod. Zod valida los límites de API e importación. La demostración reutiliza el mismo dominio, con persistencia local explícita.

## Modelo

Game representa una entrada única: metadatos, plataformas, tiendas, favorito, próximo, valoración y notas. Run representa una partida/rejugada con fechas, plataforma y estado. Activity representa juego + día local, opcionalmente vinculado a Run. Profile contiene nombre, bio y zona horaria. El avatar se representa mediante la inicial del nombre; avatarVersion se acepta solo para importar copias v1 antiguas.

El estado de biblioteca se obtiene de la partida principal. Completar historia o 100% no obliga a abandonar un juego que no tiene final. No existe entidad sesión, ni cronómetro. completionMinutes es exclusivamente el valor manual introducido en la partida.

## API

- GET/POST /api/library: estado privado y comandos validados. POST limita ráfagas por instancia (60 cambios/min).
- GET /api/library/games?page: página de juegos.
- GET /api/catalog?q&page: búsqueda en el catálogo público mediante acceso autenticado.
- GET /api/catalog/details?id, /times?id, /series?id: ficha, duración y saga de IGDB de un juego.
- GET /api/catalog/sagas?q | ?id: búsqueda de colecciones de IGDB y sus juegos.
- DELETE /api/account: borrado con confirmación y autenticación de menos de cinco minutos.

Cada Route Handler obtiene la identidad de Firebase Auth. El repositorio recibe ese UID, nunca un propietario del cuerpo. Se rechazan propiedades desconocidas en los comandos. Las relaciones partida/juego/actividad se validan sobre la biblioteca del propietario.

POST compara revision en una transacción Firestore. Ante un conflicto, responde 409 y la UI recarga el estado; no sobrescribe cambios de otro dispositivo en silencio. Los comandos de demo usan la misma lógica pero no necesitan Auth.

## Privacidad y caché

No se importa Firestore/Storage en cliente. Sus reglas deniegan lecturas/escrituras. Todas las rutas privadas se marcan dinámicas y devuelven no-store + Vary Authorization. La pantalla de usuario se desmonta al cambiar la identidad. El único almacenamiento local de biblioteca es el de demostración; Firebase Auth gestiona su propia sesión.

Solo catálogo IGDB es caché compartida. Se consulta la caché antes de aplicar límites: solo las consultas a IGDB cuentan (20/min por usuario, 150/min global). El token de catálogo es exclusivo del servidor, se renueva una sola vez ante peticiones simultáneas y se descarta si IGDB responde 401. Los documentos de caché llevan `expireAt` para la TTL de Firestore. Los avatares con iniciales se generan en la interfaz sin almacenamiento de imágenes.

Las respuestas llevan CSP, HSTS, Permissions-Policy, nosniff y X-Frame-Options (next.config.ts). Las portadas se sirven con `<img>` desde IGDB/Steam para no consumir la optimización de imágenes de Vercel Hobby.

## Presentación

`app.tsx` gestiona la navegación y los modales; la biblioteca (`library-view.tsx`, `library-filters.ts`, `game-card.tsx`), el diario y el calendario (`journal.tsx`) y el acceso (`login.tsx`) viven en módulos propios. `shared.tsx` contiene Modal, Cover y los tipos Execute/ApiRequest. Las guías de sagas se cargan bajo demanda (`saga-guides.ts`) y los detalles del catálogo se piden una sola vez por juego (`catalog-details-cache.ts`).

## Evolución

El agregado por usuario hace pequeños y fiables los cambios atómicos de v0.1; sus límites se validan antes de escribir. Para escalar, cambiar el adaptador a colecciones, paginación real con cursores y comandos transaccionales por entidad. Añadir emuladores y considerar exigir correo verificado antes del lanzamiento público.
