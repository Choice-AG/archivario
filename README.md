# Archivario

Biblioteca y diario privado de videojuegos: Next.js App Router, TypeScript, Tailwind CSS y componentes shadcn/ui sobre Radix.

## Configuración sin facturación

La configuración elegida es **Firebase Spark + Vercel Hobby**, para uso personal no comercial. Firebase App Hosting y Cloud Storage no forman parte de esta versión. No actives Blaze ni una prueba Pro para seguir esta guía.

- Firebase Authentication con correo y contraseña.
- Firestore para biblioteca, perfil y catálogo cacheado.
- Vercel Hobby para Next.js y sus rutas API.
- Avatar automático con la inicial del nombre, sin subir imágenes.
- IGDB opcional, con credenciales privadas en el servidor.

Los planes gratuitos tienen cuotas: la aplicación puede dejar de estar disponible al alcanzarlas. No se promete servicio ilimitado. Mantén Firebase en Spark y Vercel en Hobby; no vincules facturación para ampliar cuotas. El subdominio vercel.app incluido evita comprar un dominio.

## Desarrollo local

Node.js 22. Ejecuta `npm ci` y `npm run dev`. Abre http://localhost:3000. Para producción local: `npm run build`, seguido de `npm start`.

Sin configuración Firebase se ofrece una demostración local claramente identificada. Sus datos se guardan solo en el navegador y se migran automáticamente desde el nombre anterior de la aplicación.

## Conectar tu proyecto Firebase

1. En Firebase, registra una aplicación web y habilita Authentication con correo/contraseña.
2. Añade localhost a los dominios autorizados para desarrollo.
3. Crea Firestore Standard con identificador (default), en modo producción.
4. Publica firestore.rules: deniega acceso directo desde el navegador. La API autenticada del servidor accede mediante Admin SDK.
5. Copia .env.example a .env.local y rellena las cuatro variables NEXT_PUBLIC_FIREBASE_*.
6. Para el servidor local, guarda una credencial de cuenta de servicio fuera del repositorio y configura GOOGLE_APPLICATION_CREDENTIALS con su ruta.

No hace falta crear Storage. No introduzcas claves privadas en NEXT_PUBLIC_* ni en el chat. .env.local queda excluido de Git.

## Publicar en Vercel Hobby

1. Selecciona tu cuenta personal con plan Hobby. Importa un repositorio privado de este proyecto o vincúlalo con la CLI de Vercel.
2. Usa el framework Next.js y Node 22, con los comandos de compilación predeterminados.
3. Configura estas variables en el panel del proyecto, tanto para Production como para Preview si quieres probar allí:
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
   - NEXT_PUBLIC_FIREBASE_APP_ID
   - FIREBASE_SERVICE_ACCOUNT_JSON: contenido del JSON administrativo, como variable privada del servidor.
   - IGDB_CLIENT_ID e IGDB_CLIENT_SECRET, opcionales para el catálogo.
4. No configures GOOGLE_APPLICATION_CREDENTIALS en Vercel: la ruta local no existe allí. Usa FIREBASE_SERVICE_ACCOUNT_JSON.
5. Despliega y añade el dominio real de Vercel a los dominios autorizados de Firebase Authentication.
6. Prueba con dos cuentas distintas: biblioteca separada, importación, sincronización y borrado.

El servicio administrativo usa las credenciales solo en el servidor y comprueba que pertenecen al proyecto configurado. Los cambios en variables públicas requieren reconstruir la web.

## IGDB

Registra una aplicación Confidential en Twitch y activa 2FA. Conserva Client ID y Client Secret solo en variables del servidor. Archivario obtiene el token de aplicación automáticamente.

Las consultas al catálogo (búsqueda, ficha, tiempos, saga) requieren login. Los resultados públicos se cachean 24 horas en Firestore y una respuesta ya cacheada no consume límite. Solo las consultas que llegan a IGDB cuentan: 20 por minuto por usuario y 150 por minuto en total. Sin IGDB puedes añadir juegos manualmente.

La TTL de Firestore requiere facturación, así que en Spark el servidor borra de vez en cuando (en ~5 % de las consultas a IGDB) hasta 20 documentos de caché caducados. `firestore.indexes.json` excluye de índices los arrays grandes de la biblioteca y el contenido de la caché; publícalo con `firebase deploy --only firestore:indexes`.

## Importar juegos

Ajustes → Importar juegos admite dos orígenes. Los juegos que ya tienes (mismo título) no se duplican y entran como pendientes.

- **CSV:** la primera fila lleva los nombres de columna. Solo el título es obligatorio; también se reconocen plataforma, tienda, estado, nota y horas, en español o inglés, separados por coma o punto y coma.
- **Steam:** requiere `STEAM_API_KEY` en el servidor (clave gratuita en steamcommunity.com/dev/apikey) y que el perfil y la lista de juegos sean públicos. Se acepta la URL del perfil, el nombre personalizado o el SteamID64.

## Funcionalidad

Biblioteca multiplataforma; estados; favoritos y próximos tres; filtros; valoración 1–10 en pasos de 0,5; reseñas y spoilers privados; partidas y rejugadas con una principal; calendario de juego por fecha local; registro idempotente por juego/día; notas y resumen mensual.

No hay cronómetros ni horas derivadas de actividad. El tiempo de finalización es manual y opcional por partida.

Exportación JSON v1 e importación validada con vista previa y política de duplicados. Perfil privado, zona horaria, eliminación de datos/cuenta con confirmación y sesión reciente. Sincronización al recuperar el foco y cada 60 segundos mientras la pestaña está visible.

## Verificación

- npm run format:check (npm run format para corregir)
- npm run lint
- npm run typecheck
- npm test
- npm run test:e2e (compila antes de probar; requiere npx playwright install chromium)
- npm audit

GitHub Actions ejecuta estas comprobaciones en cada push a main y en cada pull request (.github/workflows/ci.yml). Las pruebas e2e usan la demostración, sin credenciales.

Las pruebas de Firebase usan adaptadores simulados: no equivalen a una verificación de IAM o del proyecto real. El borrado de cuenta se prueba sin ningún adaptador Storage.

## Límites de la primera versión

Agregado transaccional privado por usuario, guardado en bloques de hasta 400 KB (`users/{uid}/libraryChunks`) más un documento índice (`users/{uid}/private/library-v2`). Solo se reescriben los bloques que cambian. Límites: 1.000 juegos, 3.000 partidas, 15.000 actividades y 3,5 MB en total, para que la respuesta completa quepa en el límite de Vercel.

Las bibliotecas del formato anterior (`users/{uid}/private/library`) se migran solas en la primera escritura; el documento antiguo se conserva intacto como copia de seguridad.

La importación omite juegos duplicados completos o reemplaza la biblioteca explícitamente. Los antiguos campos de versión de avatar se aceptan por compatibilidad con exportaciones v1, pero no se accede a Storage.

Al borrar una cuenta se conserva únicamente un marcador técnico basado en un hash de su UID para impedir recreación por solicitudes en curso. Los datos personales y la cuenta Authentication se eliminan. Los antiguos objetos Storage, si se hubieran creado fuera de esta configuración gratuita, requieren limpieza independiente.

## Documentación

Arquitectura: docs/ARCHITECTURE.md. Decisiones: docs/DECISIONS.md.

- [Firebase Spark y cuotas](https://firebase.google.com/pricing)
- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [IGDB](https://api-docs.igdb.com/)

## Flujo de trabajo con GitHub

El código fuente y sus pruebas deben guardarse en GitHub. Las credenciales se mantienen en
`.env.local` durante el desarrollo y en las variables del proyecto de Vercel en producción;
no se incluyen en los commits. La carpeta `work/` contiene comprobaciones temporales y también
queda fuera del repositorio.

Antes de integrar cambios: `npm run lint`, `npm test` y `npm run test:e2e`.
La publicación debe realizarse desde la rama de producción del repositorio conectado a Vercel.
La conexión del repositorio y la rama se configura en el proyecto existente, conservando sus variables.
