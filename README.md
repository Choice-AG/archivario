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

Las búsquedas requieren login, texto válido y paginación; están limitadas a 20 por minuto por usuario. Los resultados públicos se cachean durante 24 horas en Firestore. Sin IGDB puedes añadir juegos manualmente.

## Funcionalidad

Biblioteca multiplataforma; estados; favoritos y próximos tres; filtros; valoración 1–10 en pasos de 0,5; reseñas y spoilers privados; partidas y rejugadas con una principal; calendario de juego por fecha local; registro idempotente por juego/día; notas y resumen mensual.

No hay cronómetros ni horas derivadas de actividad. El tiempo de finalización es manual y opcional por partida.

Exportación JSON v1 e importación validada con vista previa y política de duplicados. Perfil privado, zona horaria, eliminación de datos/cuenta con confirmación y sesión reciente. Sincronización al recuperar el foco y cada 30 segundos.

## Verificación

- npm run typecheck
- npm test
- npm run build
- npm run test:e2e (requiere instalar Chromium mediante npx playwright install chromium)
- npm audit

Las pruebas de Firebase usan adaptadores simulados: no equivalen a una verificación de IAM o del proyecto real. El borrado de cuenta se prueba sin ningún adaptador Storage.

## Límites de la primera versión

Agregado transaccional privado por usuario: hasta 200 juegos, 600 partidas, 3.000 actividades y 450 KB UTF-8. La UI pagina juegos y diario; la sincronización carga el agregado completo. Antes de bibliotecas grandes, migrar el repositorio a colecciones y consultas con cursor.

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

Antes de integrar cambios: `npm test`, `npm run build` y `npm run test:e2e`.
La publicación debe realizarse desde la rama de producción del repositorio conectado a Vercel.
La conexión del repositorio y la rama se configura en el proyecto existente, conservando sus variables.
