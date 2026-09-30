# Alojamiento sin costes

Decisión: Firebase Spark y Vercel Hobby, para uso personal no comercial. Se abandona la inicialización de App Hosting por su requisito de facturación.

No se ha activado Blaze, creado un backend App Hosting ni contratado un plan Vercel de pago. Vincular el proyecto local mediante .firebaserc no activa facturación.

Cloud Storage se retira del flujo de la aplicación, incluida la eliminación de cuenta. Los avatares muestran la inicial del nombre. FIREBASE_SERVICE_ACCOUNT_JSON permite autenticar el servidor en Vercel sin depender de rutas locales.

Firebase y Vercel tienen cuotas gratuitas; los excesos pueden detener funciones o requerir esperar al siguiente periodo. Mantener ambos planes gratuitos evita habilitar consumo de pago. Antes de publicar, comprobar en los paneles Spark y Hobby.

La publicación queda pendiente de acceso a la cuenta Vercel y configuración privada de sus variables. No se deben compartir claves por chat.

Vercel vinculado: choice-ags-projects/archivario-firebase (Hobby verificado). Se creó un proyecto separado porque archivario ya existía. Variables públicas de Firebase configuradas para Production. Pendiente: FIREBASE_SERVICE_ACCOUNT_JSON y despliegue; IGDB es opcional.

30-09-2026: Producción disponible en https://archivario-firebase.vercel.app. Credencial privada configurada en Vercel. API sin sesión comprobada: 401. Firestore (default) creado en eur3, Standard, freeTier=true, reglas privadas e índices publicados. Pendiente de inicializar Firebase Authentication desde consola y habilitar correo/contraseña; añadir archivario-firebase.vercel.app a dominios autorizados. La API pública de inicialización de Identity Platform requiere facturación y no se utiliza.

Estado actual: https://archivario-firebase.vercel.app operativo. Firebase Authentication activado, dominio autorizado, Firestore conectado e IGDB configurado y verificado en producción. Se mantienen Spark y Hobby; no hay pasos de activación pendientes para el catálogo.
