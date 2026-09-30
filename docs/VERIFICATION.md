# Verificación de Archivario · 29 de septiembre de 2026

## Resultado

- Compilación de producción Next.js: correcta.
- TypeScript: sin errores.
- 23 pruebas automáticas de dominio y API: correctas.
- 4 recorridos de navegador (dos por tamaño, escritorio 1440 px y móvil 390 px): correctos.
- Capturas inspeccionadas visualmente en ambos tamaños: seis portadas cargadas, sin desbordamiento horizontal y sin errores JavaScript.
- Auditoría npm tras actualizar dependencias: 0 vulnerabilidades conocidas en el árbol instalado.

## Recorridos comprobados

Actividad idempotente «He jugado hoy», guardado de reseña/spoiler, nueva rejugada conservando historial, creación manual multiplataforma, persistencia de demostración tras recarga, importación con vista previa, calendario adaptable y rechazo de llamadas API sin identidad.

Las pruebas unitarias cubren fecha local, fechas imposibles, propiedad de partidas, máximo de tres próximos, valoraciones, no derivación de horas, borrado relacionado, formato y duplicados de importación, separación entre usuarios, conflictos de revisión y bloqueo al eliminar cuenta.

## Pendiente de configuración

No se ha usado un proyecto Firebase real ni credenciales IGDB. Login, correos, IAM, búsqueda IGDB y borrado remoto requieren prueba contra el proyecto elegido. La infraestructura está implementada; no se presenta como una integración ya verificada.

## Dependencias

Se actualizó firebase-admin a 14.5.0 y Vitest a 5.0.2. La dependencia transitiva uuid de gaxios se fija mediante override compatible a 11.1.1 o superior para corregir un aviso de seguridad; verificar los permisos reales de Firebase al conectar el servidor.

## Ejecución local

La aplicación queda disponible en http://127.0.0.1:3000 mientras permanezca activo su proceso local. Se ha solicitado abrirla en el panel del chat. No se ha publicado.

## Adaptación al plan gratuito

Se ha retirado Storage de la aplicación y del borrado de cuenta. Se han añadido tres pruebas de eliminación sin Storage. Compilación correcta; 23 pruebas de dominio/API y 4 recorridos de navegador pasan. Vercel Hobby está preparado; la publicación requiere completar el acceso a Vercel y configurar sus variables privadas.
30-09-2026: Firebase Admin/jwks-rsa usa override jose 5.10.0 por incompatibilidad require(ESM) en Vercel Node 22. Prueba real de carga y resolución de clave RSA añadida: 24 pruebas unitarias correctas. Producción devuelve 200 para la web y 401 en API sin sesión. Firestore Standard gratuito inicializado con reglas cerradas.

30-09-2026: IGDB configurado como secretos de producción. Despliegue dpl_2nCHQXTqF1gh88MW5kSteRKsNaZt listo. Búsqueda autenticada real de Hollow Knight en /api/catalog: HTTP 200, 16 resultados. Cuenta temporal de verificación y contador eliminados al terminar. Authentication y Firestore conectados; correo/contraseña y dominio publicados habilitados.
