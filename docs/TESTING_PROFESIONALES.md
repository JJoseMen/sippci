# Testing Profesionales — E2E

**Fecha:** 28/09/2026 (cierre FASE 2)

Suite: `frontend/e2e/profesionales.spec.ts` — 7 tests, todos pasando
(última corrida 28/09/2026: 7/7 dentro del global 15/15).

## Prerrequisitos

1. PostgreSQL arriba con BD `sippci` migrada (8 migraciones, `up to date`)
   y seeds cargados: `prisma/seed.ts` + `prisma/seed-profesionales.ts`
   (aportan `SOL-NAT-2026-001/002`, `CERT-2026-0001`).
2. Backend arriba: `node backend/dist/main` (o `npm run start:dev`) → `http://localhost:3001`.
3. Frontend dev arriba: `npm run dev` en `frontend/` → `http://localhost:5173`
   (el proxy `/api → localhost:3001` es obligatorio para el login).
4. Kerberos en modo mock (`KERBEROS_MOCK_MODE=true`).
5. Navegadores Playwright instalados (`npx playwright install`).

## Cómo correrlo

```bash
cd frontend
npx playwright test e2e/profesionales.spec.ts --reporter=list
```

## Cobertura (7 tests)

| # | Test | Qué verifica |
|---|------|--------------|
| 1 | Sidebar muestra solo Profesionales | Login Kerberos CI `8812345`/`123456` (GESTOR_REGISTRO_PROFESIONAL) llega a `/admin/dashboard`; ve "Profesionales", NO ve "Cumplimiento SIPPCI" ni "Pagos" |
| 2 | Lista de solicitudes Natural carga | Navega a `/admin/profesionales/solicitudes/natural`, hay ≥1 fila y visible `SOL-NAT-2026-001` |
| 3 | Expediente Digital muestra datos | `/admin/profesionales/solicitudes/natural/SOL-NAT-2026-002` muestra heading, titular "Juan" y botones Aprobar/Observar/Rechazar |
| 4 | Modal Observar abre y valida | Modal "Observar Solicitud", botón deshabilitado hasta ≥10 chars, cierra con Escape |
| 5 | Lista de certificados emitidos carga | `/admin/profesionales/certificados` con heading y ≥1 fila |
| 6 | Página pública de validación funciona | Sin sesión, `/validar-certificado/CERT-2026-0001` muestra "Certificado Válido" + código |
| 7 | Validación de certificado inválido | `/validar-certificado/INVALIDO-123` muestra "Certificado No Válido" |

## Notas

- Login pasa por `beforeEach` (Kerberos mock frontend + `POST /api/auth/kerberos/exchange`).
- Si el backend está caído, los 7 fallan en `beforeEach` (timeout esperando `/admin/dashboard`).
- Tests 6–7 no requieren sesión (usan `context.clearCookies()` / ruta pública).
