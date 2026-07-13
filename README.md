# VisionAssist MVP

Aplicación Android/Ionic que captura automáticamente un objeto estable y envía un único JPEG a una API Node/Express. El servidor consulta un proveedor de visión compatible con OpenAI, valida el JSON y guarda sólo el resultado en PostgreSQL.

> **Estado:** MVP experimental. No debe usarse como única fuente para decisiones médicas, de seguridad o navegación. Las identificaciones pueden ser incorrectas.

VisionAssist es software libre bajo licencia MIT. Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para colaborar, [SECURITY.md](SECURITY.md) para reportar vulnerabilidades y [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) para las normas de la comunidad.

## Arquitectura

- `mobile`: Angular + Ionic + Capacitor. `getUserMedia` alimenta un `<video>`; un canvas 320×240 analiza la región central localmente. Ningún fotograma de análisis sale del teléfono.
- `server`: API REST Express. Multer mantiene el archivo únicamente en memoria, `VisionProvider` aísla el proveedor, Zod valida su salida y `pg` persiste metadatos.
- `postgres`: historial sin fotografías. La migración se ejecuta automáticamente al crear el contenedor.

## Requisitos

- Node.js 22.22.3 o superior y npm 10
- Docker con Compose (o PostgreSQL 14+)
- Android Studio, JDK 21 y Android SDK para compilar Android
- Dispositivo Android o emulador con cámara

## Instalación y backend

```bash
cd vision-assist
npm install
cp server/.env.example server/.env
docker compose up -d postgres
npm run dev -w server
```

Configure `VISION_API_KEY`; nunca copie esa clave en `mobile`. Variables disponibles:

| Variable | Uso |
|---|---|
| `PORT` | Puerto de Express, 3000 por defecto |
| `DATABASE_URL` | URL PostgreSQL |
| `VISION_API_KEY` | Clave secreta del proveedor |
| `VISION_MODEL` | Modelo con capacidad de visión |
| `VISION_API_BASE_URL` | Base compatible con `/chat/completions` |
| `MAX_IMAGE_SIZE_MB` | Máximo de imagen, 8 por defecto |
| `VISION_TIMEOUT_MS` | Timeout externo, 30000 por defecto |
| `CORS_ORIGIN` | Orígenes separados por coma |
| `ANALYZE_RATE_LIMIT_PER_MINUTE` | Límite por IP |

Para PostgreSQL sin Docker, cree la base indicada por `DATABASE_URL` y ejecute, en orden, las migraciones de `server/src/database/migrations`.

## Despliegue en Dokploy

El `Dockerfile` de la raíz compila el backend y la PWA en un único contenedor. Express sirve la PWA y las rutas `/api/v1`, por lo que sólo se necesita una Application de Dokploy:

1. Seleccione build type `Dockerfile`, ruta `Dockerfile` y contexto `.`.
2. Exponga el puerto interno `3000` y asigne el dominio HTTPS `vision.rivasystems.dev`.
3. Configure las variables de `server/.env.example`, usando la URL de PostgreSQL externa. En producción, `CLIENT_ID_HASH_SECRET` debe ser un secreto aleatorio de al menos 32 caracteres.
4. Configure el healthcheck en `/api/v1/health`.
5. Ejecute las migraciones `001` y `002` contra PostgreSQL antes del primer despliegue.

La PWA usa `/api/v1` en el mismo origen y Android usa `https://vision.rivasystems.dev/api/v1`. En Dokploy configure `CORS_ORIGIN=https://vision.rivasystems.dev,https://localhost` antes de ejecutar `npm run cap:sync -w mobile`.

## Ionic en navegador

El emulador Android accede al host mediante `10.0.2.2`; esa URL ya está en `mobile/src/environments/environment.ts`. Para un teléfono físico, sustitúyala por la IP LAN del equipo y permita ese origen en `CORS_ORIGIN`.

```bash
npm start -w mobile
```

La cámara web exige contexto seguro: funciona en `localhost`; para probar desde otro dispositivo use HTTPS o la aplicación Android. Acepte el permiso cuando se solicite.

## Android y APK de prueba

```bash
npm run cap:add:android -w mobile
npm run cap:sync -w mobile
npm run cap:open:android -w mobile
```

En Android Studio seleccione **Build > Build Bundle(s) / APK(s) > Build APK(s)**. El APK debug queda normalmente en `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Si el backend usa HTTP durante desarrollo, añada `android:usesCleartextTraffic="true"` al elemento `application` del manifiesto; para producción use HTTPS. Capacitor añade el permiso de cámara requerido por WebView cuando el navegador lo solicita.

## API

```bash
curl -F image=@objeto.jpg http://localhost:3000/api/v1/vision/analyze
curl 'http://localhost:3000/api/v1/vision/history?page=1&limit=20'
curl http://localhost:3000/api/v1/vision/history/UUID
curl -X DELETE http://localhost:3000/api/v1/vision/history/UUID
curl http://localhost:3000/api/v1/health
```

`POST /vision/analyze` responde `{ success, analysisId, result }`. Una marca o modelo inciertos son `null` y las dudas aparecen en `warnings`.

## Configuración de detección

Todos los umbrales están en `mobile/src/app/core/config/vision.config.ts`: intervalo, movimiento máximo (0.03), estabilidad (1000 ms), exposición, varianza, nitidez, cooldown (4000 ms), calidad JPEG y distancia de hash. La captura manual ignora la deduplicación, pero no permite solicitudes simultáneas.

El escáner inicia pausado y solicita la cámara selfie con fallback automático. El botón visible permite comenzar o pausar el análisis.

## Calidad y pruebas

```bash
npm run build
npm test
```

Las pruebas cubren movimiento/hash y validación estricta de respuestas. TypeScript se compila en modo estricto.

Cada push y pull request ejecuta compilación y pruebas en GitHub Actions. Dependabot revisa semanalmente las dependencias npm y mensualmente las acciones utilizadas por CI.

## Privacidad y seguridad

- Las imágenes se mantienen en memoria durante el análisis y no se guardan en PostgreSQL.
- La clave del proveedor sólo pertenece al backend; nunca debe añadirse al código móvil ni a Git.
- No publique archivos `.env`, certificados, claves privadas, fotografías ni volcados de base de datos.
- Antes de desplegar públicamente, use HTTPS, una contraseña de base de datos fuerte, un secreto aleatorio para `CLIENT_ID_HASH_SECRET`, CORS restrictivo y límites de solicitudes adecuados.

## Problemas comunes

- **Permiso rechazado:** habilite Cámara en Ajustes > Aplicaciones > VisionAssist y reintente.
- **Cámara ocupada:** cierre otras apps que usan la cámara.
- **Sin conexión desde emulador:** compruebe que la API escucha en el host y use `10.0.2.2`, no `localhost`.
- **CORS:** incluya el origen exacto en `CORS_ORIGIN`.
- **Imagen oscura/desenfocada:** aumente la luz, limpie la lente y mantenga el objeto quieto dentro de la guía.
- **Base no disponible:** revise `docker compose ps`, `DATABASE_URL` y que la migración exista.
- **Proveedor no disponible/JSON inválido:** verifique clave, modelo, URL base y que el proveedor soporte salida JSON y entrada visual.

## Supuestos del MVP

El proveedor inicial usa el protocolo de chat completions compatible con OpenAI. La señal de “objeto” es variación visual en la región central, no detección semántica. El botón “identificación incorrecta” es informativo por ahora, ya que el MVP no incluye cuentas ni entrenamiento. No se guardan imágenes ni se identifica a personas.
