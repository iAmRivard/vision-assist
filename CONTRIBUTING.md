# Contribuir a VisionAssist

Gracias por ayudar a mejorar VisionAssist. Buscamos contribuciones que hagan la aplicación más accesible, privada, confiable y fácil de ejecutar.

## Antes de empezar

- Para errores o propuestas, abra un issue y compruebe que no exista uno equivalente.
- Para cambios grandes, describa primero el enfoque en un issue para coordinar el alcance.
- No incluya fotografías, credenciales, datos personales ni información sensible en issues, pruebas o commits.
- Las decisiones de accesibilidad deben probarse, cuando sea posible, con lectores de pantalla y navegación sin depender sólo de elementos visuales.

## Desarrollo local

1. Haga un fork y cree una rama desde `main`.
2. Instale Node.js 20+, npm 10+ y las dependencias con `npm ci`.
3. Copie `server/.env.example` a `server/.env` y complete sus valores locales.
4. Inicie PostgreSQL con `docker compose up -d postgres`.
5. Ejecute `npm run build` y `npm test` antes de enviar el cambio.

Consulte el README para ejecutar la aplicación web y Android.

## Pull requests

- Mantenga cada PR enfocado en un solo problema.
- Añada o actualice pruebas cuando cambie comportamiento.
- Actualice la documentación y el archivo de ejemplo de entorno si cambia configuración.
- Explique qué cambió, cómo se verificó y cualquier impacto en privacidad o accesibilidad.
- Acepte el [Código de conducta](CODE_OF_CONDUCT.md) en toda interacción del proyecto.

Al contribuir, acepta que su contribución se distribuya bajo la licencia MIT del proyecto.
