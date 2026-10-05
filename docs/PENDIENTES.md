# Pendientes — SIPPCI

**Última actualización:** 01/10/2026 (FASE 3.4.B Certificados de Capacitación, rama `rodri`)

## Resumen

| # | Pendiente | Severidad | Estado |
|---|-----------|-----------|--------|
| 1 | SMTP sin configurar (OTP por consola `[DEV]`) | 🔴 crítico | Vigente |
| 2 | Lint backend: 2 errores + 10 warnings | 🟡 medio | Vigente |
| 3 | Bundle frontend: chunk 1.3 MB (recharts, sin code splitting) | 🟡 medio | Vigente |
| 4 | Pasada manual en navegador (flujos UI E.2–E.6) | 🟡 medio | Vigente |
| 5 | 6 docs citados en ESTRUCTURA.md que no existían | 🟢 bajo | ✅ Resuelto 28/09/2026 |
| 6 | Migración Sass `@import` → `@use` | 🟢 bajo | ✅ Resuelto (vite.config ya usa `@use`) |
| 7 | Re-ejecutar E2E en esta instancia | — | ✅ Hecho 28/09/2026: 15/15 |
| 8 | Placeholders `pages/public/Login\|Register` | — | ✅ Eliminados (FASE III) |
| 9 | Registro JURIDICA ignoraba NIT | — | ✅ Corregido |
| 10 | 9 errores ESLint frontend (`react-hooks/exhaustive-deps`) | 🟡 medio | Vigente — ver §FASE 3.3 |
| 11 | Bug Modal: el backdrop tapaba el `dialog` (afectaba a toda la app) | 🔴 alto | ✅ Resuelto — ver §FASE 3.3 |
| 12 | Instructor sin botón "Reactivar" (decisión: entidad básica) | — | ✅ Decidido — ver §FASE 3.3 |
| 13 | Fixtures de capacitación creadas a mano en la BD | — | ✅ Resueltos (seed reproducible) |
| 14 | Test 13 acumulaba instructores inactivos en cada corrida | — | ✅ Resuelto (CI fijo 99999999) |
| 15 | `certificado_capacitacion.participanteId`/`emitidoPorId` sin FK | 🟡 medio | Vigente — ver §FASE 3.4.B |
| 16 | Race condition en la numeración `CERT-CAP-YYYY-NNNN` | 🟡 medio | Vigente — ver §FASE 3.4.B |
| 17 | Sin revocación de certificados de capacitación | 🟢 bajo | ✅ Decidido: fuera de alcance |
| 18 | Sin re-emisión (409 si ya existe) | 🟢 bajo | ✅ Decidido: fuera de alcance |
| 19 | `ListasPage` / `PuntajesPage` son stubs | 🟢 bajo | Vigente — ver §FASE 3.4.B |
| 20 | PDFs huérfanos en `uploads/certificados/` | 🟢 bajo | Vigente — ver §FASE 3.4.B |
| 21 | Unificar subtipos SIPPCI (NATURAL/JURIDICA/INFRAESTRUCTURA) | 🟢 bajo | Vigente — ver §SUBTIPOS-SIPPCI |

## 1. SMTP sin configurar — 🔴 crítico

- El OTP se imprime en consola del backend: `[DEV] OTP para <email>: <codigo>`.
- Configurar variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  en `backend/.env` para envío real (app password de Gmail).
- Bloquea la entrega de credenciales a usuarios reales.

## 2. Lint backend: 2 errores + 10 warnings — 🟡 medio

- Verificado 28/09/2026 con `npx eslint "src/**/*.ts"` (sin `--fix`, sin modificar código).
- Errores (`@typescript-eslint/no-require-imports`):
  - `certificados/certificados-pdf.service.ts:4`
  - `declaraciones/declaraciones.service.ts:7`
- Warnings (`no-unused-vars`, ver `docs/LINT_WARNINGS.md` para el detalle histórico):
  - `declaraciones.service.ts`, `documentos.service.ts`, `pagos.service.ts`,
    `profesionales.service.ts`, `create-usuario.dto.ts`, `certificados-pdf.service.ts`.
- No rompen el build (`npm run build` exit 0), pero los 2 errores deben
  corregirse antes de activar lint como gate de CI.

## 3. Bundle frontend: chunk 1.3 MB — 🟡 medio

- `npm run build` (frontend) emite `assets/index-*.js` de ~1.3 MB (gzip ~379 kB)
  por `recharts` + resto del bundle sin code splitting.
- Acción: `import()` dinámico en páginas de reportes y/o
  `build.rollupOptions.output.manualChunks`. No bloquea FASE 3.

## 4. Pasada manual en navegador — 🟡 medio

- Verificación visual de los flujos UI (E.2–E.6) pendiente en esta instancia.
- El E2E automatizado ya cubre los flujos (15/15), falta solo ojo humano.

## 5. Docs citados en ESTRUCTURA.md — 🟢 bajo — ✅ Resuelto 28/09/2026

- Creados: `API_CUMPLIMIENTO.md`, `MATRIZ_PROFESIONALES.md`,
  `MATRIZ_CUMPLIMIENTO.md`, `MODULO_CUMPLIMIENTO.md`,
  `TESTING_PROFESIONALES.md`, `TESTING_CUMPLIMIENTO.md`.

## 6. Migración Sass — 🟢 bajo — ✅ Resuelto

- ~~`frontend/vite.config.ts` usaba `@import` en `additionalData`.~~
- Verificado: ya usa `@use "@/assets/styles/variables" as *;` con
  `silenceDeprecations: ['import', 'global-builtin']`. Sin acción.

## 7. E2E en esta instancia — ✅ Hecho 28/09/2026

- ~~Re-ejecutar el recorrido E2E completo en esta instancia.~~
- Resultado: **15/15 pasando** (8 Cumplimiento + 7 Profesionales),
  `npx playwright test --reporter=list`, backend (prod) + frontend (dev) arriba.
- Detalle por test en `docs/TESTING_PROFESIONALES.md` y
  `docs/TESTING_CUMPLIMIENTO.md`.

## 8. Placeholders muertos — ✅ Eliminados

- ~~`frontend/src/pages/public/LoginPage.tsx` y `frontend/src/pages/public/RegisterPage.tsx`
  eran stubs sin ruta; el router usaba `pages/auth/*`.~~
- **Eliminados** en FASE III. El router (`src/router/index.tsx`) usa
  `pages/auth/LoginPage` y `pages/auth/RegisterPage`; sin referencias rotas;
  `pages/public/` queda solo con páginas públicas reales.

## 9. Registro JURIDICA ignora NIT — ✅ Corregido

- ~~El flujo `POST /api/auth/register` creaba el usuario con `tipo=JURIDICA` e ignoraba el
  campo `nit` (no creaba/asociaba `empresas` ni `usuarios_empresas`).~~
- **Corregido** en `backend/src/modules/auth/auth.service.ts`: cuando
  `tipoPersona=JURIDICA` y hay `nit`, se ejecuta `prisma.$transaction` que crea:
  1. El usuario.
  2. La `empresa` (`nit`, `razonSocial` = nombreCompleto, `representanteLegal` =
     nombreCompleto, `email`, `telefono`).
  3. La relación `usuarios_empresas` con `rol='REPRESENTANTE'`.
- Respuesta: `{ message, userId, empresaId }` (`empresaId` null para NATURAL).
- Verificado: JURIDICA crea usuario+empresa+relación; NATURAL queda sin relación.

## FASE 3.3 — Capacitaciones (cierre 01/10/2026)

### 10. 9 errores ESLint frontend — 🟡 medio — Vigente

- Verificado 01/10/2026 con `npx eslint src` (sin `--fix`, sin modificar código).
- 9 errores `react-hooks/exhaustive-deps` ("rule not found"), todos en módulos
  **ajenos a Capacitaciones**: `pages/admin/cumplimiento/` y
  `pages/admin/profesionales/`.
- 0 errores en `src/pages/admin/capacitaciones/` ni en `e2e/`.
- No rompen el build (`npm run build` exit 0). **Decisión: no tocarlos** en
  FASE 3.3 (fuera de alcance); corregirlos aparte antes de activar lint como
  gate de CI.

### 11. Bug del Modal (backdrop sobre el `dialog`) — ✅ Resuelto

- **Hallazgo:** en `frontend/src/components/ui/Modal/Modal.module.scss` el
  backdrop tenía `z-index: 50` y `.dialog` quedaba `position: static`, así que
  el backdrop se pintaba **encima** del panel. Cualquier click dentro de
  cualquier modal de la app caía en el backdrop y se cerraba.
- **Alcance real:** afectaba a **toda la aplicación** (Confirmar, Editar,
  Inscribir, Reprogramar… de Cumplimiento, Profesionales y Capacitaciones).
  Ningún E2E anterior hacía click dentro de un modal, por eso nunca saltó.
- **Fix:** `.dialog { position: relative; z-index: 51; }`. Compartido a todos
  los módulos; es el único cambio de un módulo ajeno hecho en FASE 3.3 y está
  justificado porque el bug era global.
- Referencia: `frontend/src/components/ui/Modal/Modal.module.scss`.

### 12. Instructor sin botón "Reactivar" — ✅ Decidido

- **Decisión del usuario:** el instructor es **entidad básica**. La UI expone
  solo **Desactivar** (soft delete, `activo=false`); si un instructor se
  desactiva se crea uno nuevo o se queda así.
- No se implementó botón ni flujo de reactivación en la interfaz.
- `ActualizarInstructorDto` **sí acepta `activo?: boolean`** (`backend/src/modules/capacitaciones/dto/actualizar-instructor.dto.ts`),
  exclusivamente para API y para que los tests puedan restaurar el registro de
  prueba. El endpoint es `PUT /api/admin/sippci/capacitaciones/instructores/:id`.
- Aún no existe `DELETE` duro: el soft delete no es reversible desde la UI.

### 13. Fixtures de capacitación manuales — ✅ Resueltos

- ~~Datos de capacitación cargados a mano sobre la BD, no reproducibles.~~
- Reemplazados por seeds reproducibles:
  - `backend/prisma/seed-capacitaciones.ts` — 4 cursos base (ya en `prisma:seed`).
  - `backend/prisma/seed-programaciones.ts` — 3 programaciones de ejemplo.
  - `backend/prisma/seed-capacitaciones-completo.ts` — fixtures completos de la
    FASE 3.3: 3 instructores (CI 5123456/5234567/5345678), 4 programaciones
    (1 por curso, ids fijos 1-4), 6 participantes (CI 1000001-1000006) y
    6 inscripciones. Idempotente (solo upsert, nunca borra).
- **No registrados en `package.json`** a propósito. Orden manual:
  1. `cd backend && npx ts-node prisma/seed-programaciones.ts`
  2. `cd backend && npx ts-node prisma/seed-capacitaciones-completo.ts`
- ⚠️ El paso 2 es el **definitivo**: `seed-programaciones.ts` escribe estados y
  cursos distintos para los ids 1-3, así que hay que correr siempre el
  `completo` al final. Idempotencia verificada 01/10/2026 (2 corridas seguidas,
  hashes de BD idénticos).

### 14. Test 13 acumulaba instructores inactivos — ✅ Resuelto

- ~~`capacitaciones.spec.ts` test 13 creaba un instructor con CI derivado de
  `Date.now()` y lo desactivaba: cada corrida dejaba 1 fila inactiva nueva.~~
- Ahora usa **CI fijo `99999999`** (ficticio, no choca con datos reales):
  - `beforeAll`: crea el instructor si no existe, o lo reactiva si quedó inactivo.
  - test: filtra por CI → edita → desactiva.
  - `afterAll`: lo reactiva vía `PUT` con `{ activo: true }`.
- Resultado: **0 acumulación** de instructores inactivos tras N corridas.

## FASE 3.4.B — Certificados de Capacitación (cierre 01/10/2026)

### 15. FKs ausentes en `certificado_capacitacion` — 🟡 medio — Vigente

- `participanteId` e `emitidoPorId` son **enteros sin `@relation`** en
  `backend/prisma/schema.prisma` (solo `@@index`). Se resuelven con joins
  manuales en Prisma (`INCLUDE_CERTIFICADO`) y con lookups en el servicio.
- **Decisión:** no se añaden FKs para no requerir una migración en esta fase.
- Riesgo: un `participanteId` o `emitidoPorId` huérfano no sería detectado por
  la BD. Acción futura: migración con `ON DELETE SET NULL` en `emitidoPorId`.
- **Sí existen FKs** hacia `cursos` e `instructores`, y hacia
  `participante_programacion.certificadoId`.

### 16. Race condition en la numeración de códigos — 🟡 medio — Vigente

- `generarCodigoCertificado()` hace `SELECT COUNT(*) + 1` sobre
  `certificado_capacitacion` dentro de la transacción de emisión. Dos
  emisiones simultáneas pueden calcular el mismo número.
- La columna `codigo` tiene `@unique`, así que la segunda falla con
  **violación de índice (500)** en vez de duplicar el certificado.
- **Réplica deliberada** del patrón de `certificados` (Profesionales/Cumplimiento)
  para no introducir un comportamiento distinto en un solo módulo.
- Acción futura: secuencia en BD o `CREATE SEQUENCE` por año.

### 17. Sin revocación — ✅ Decidido (fuera de alcance)

- **Decisión del usuario:** no se implementa revocación en FASE 3.4.B. El
  único estado real es `EMITIDO`; `VENCIDO`/`REVOCADO` existen en el enum pero
  no se asignan desde la UI.
- La validación pública marca `vencido` solo cuando `vigenciaHasta < hoy`.

### 18. Sin re-emisión — ✅ Decidido (fuera de alcance)

- **Decisión del usuario:** no hay re-emisión. `POST .../emitir` responde
  **409** si `participante_programacion.certificadoId` ya está seteado o si
  existe un certificado para el par (programación, participante).
- Para repetir una corrida de E2E hace falta reiniciar el estado:
  `npx ts-node prisma/seed-capacitaciones-completo.ts` borra los certificados
  de las 6 inscripciones fixture y pone `certificadoEmitido = false`.
  **`frontend/e2e/global-setup.ts` ejecuta ese seed automáticamente** al
  arrancar `npm run test:e2e` (registrado en `playwright.config.ts`).

### 19. Páginas stub de capacitación — 🟢 bajo — Vigente

- `frontend/src/pages/admin/capacitaciones/ListasPage.tsx` y `PuntajesPage.tsx`
  son **stubs con `EmptyState`** ("en desarrollo" / "próximamente") creados para
  que los enlaces del menú (`menu.config.tsx`) dejen de apuntar a rutas inexistentes.
- `CursosPage.tsx` sí muestra el catálogo fijo (solo lectura).
- Acción futura: listado centralizado de listas de asistencia y reporte de puntajes.

### 20. PDFs huérfanos en `uploads/certificados/` — 🟢 bajo — Vigente

- Borrar un `certificado_capacitacion` (seed fixture) **no borra el `.pdf`**.
- `obtenerRutaPdf()` tiene *self-healing*: si el archivo no existe lo regenera
  desde la BD, así que la descarga sigue funcionando.

## SUBTIPOS-SIPPCI — Unificar subtipos (Opción A vigente) — 🟢 bajo

- **Decisión (rama `rodri`):** SIN migración. El backend de Cumplimiento
  acepta los 3 subtipos (`NATURAL`, `JURIDICA`, `INFRAESTRUCTURA`):
  la lista Natural incluye `NATURAL` + `INFRAESTRUCTURA`, la lista
  Jurídica incluye `JURIDICA` + `INFRAESTRUCTURA` con
  `datosJson.tipoPersona = JURIDICA`. Las rutas no cambian.
- Origen: el wizard SIPPCI crea `INFRAESTRUCTURA` para no-JURIDICA
  (`FormularioSIPPCI.tsx`), por eso hay filas mixtas (8 SIPPCI:
  3 NATURAL, 3 JURIDICA, 2 INFRAESTRUCTURA al 10/2026).
- Deuda futura: migrar `INFRAESTRUCTURA` → `NATURAL`/`JURIDICA` según
  `tipoPersona` y simplificar los filtros a igualdad de subtipo.

## Incidente BD 2026-09-30

### Qué pasó
- prisma migrate diff --shadow-database-url apuntó por error a la BD
  principal (sippci) en vez de a una shadow DB separada.
- Prisma la usó como shadow → vació las 24 tablas + borró _prisma_migrations.
- Datos perdidos: todo el estado acumulado de desarrollo.

### Cómo se recuperó
- Backup pre-B2: backup_ppre_b2_2026-09-28.sql (91 KB, 28/09/2026 17:26).
- Restauración completa: 11 solicitudes, 3 certificados, 7 usuarios externos,
  10 usuarios internos, 3 empresas, etc.
- Migraciones posteriores aplicadas con migrate deploy.
- 16/16 E2E tras la restauración.

### Verificación
- Acentos: correctos (no corruptos, artefacto de consola).
- IDs y FKs: intactas.
- CERT-2026-0001: restaurado (ligado a SOL-JUR-2026-002).

### Lecciones
1. SIEMPRE backup antes de tocar schema.
2. Usar prisma migrate dev --create-only (genera SQL sin aplicar).
3. NUNCA usar --shadow-database-url apuntando a la principal.
4. Documentar cómo funciona prisma db seed (solo corre seed.ts).
5. package.json debe registrar TODOS los seeds.

### Deudas pendientes
- [ ] Test reproducibilidad (migrate reset + seed + E2E) — NO ejecutado.
- [ ] Confusión PostgreSQL 15 (:5432) vs 17 (:5433) — documentar en README.
- [ ] Programa de backup automático (scripts/backup-db.ps1 creado, no programado).
