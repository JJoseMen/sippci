# Pendientes — SIPPCI

**Última actualización:** 28/09/2026 (cierre FASE 2, rama `rodri`)

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
