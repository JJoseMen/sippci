# Testing Cumplimiento — E2E

**Fecha:** 28/09/2026 (cierre FASE 2)

Suite: `frontend/e2e/cumplimiento.spec.ts` — 8 tests, todos pasando
(última corrida 28/09/2026: 8/8 dentro del global 15/15).

## Prerrequisitos

1. PostgreSQL arriba con BD `sippci` migrada (8 migraciones, `up to date`)
   y seeds cargados: `prisma/seed.ts` + `prisma/seed-cumplimiento.ts`
   (aportan `SIPPCI-NAT-2026-001/002`, `SIPPCI-JUR-2026-001`, `CERT-SIPPCI-2026-0001`).
2. Backend arriba: `node backend/dist/main` (o `npm run start:dev`) → `http://localhost:3001`.
3. Frontend dev arriba: `npm run dev` en `frontend/` → `http://localhost:5173`
   (el proxy `/api → localhost:3001` es obligatorio para el login).
4. Kerberos en modo mock (`KERBEROS_MOCK_MODE=true`).
5. Navegadores Playwright instalados (`npx playwright install`).

## Cómo correrlo

```bash
cd frontend
npx playwright test e2e/cumplimiento.spec.ts --reporter=list
```

## Cobertura (8 tests)

| # | Test | Qué verifica |
|---|------|--------------|
| 1 | Sidebar muestra Cumplimiento SIPPCI | Login Kerberos CI `9905200`/`123456` (GESTOR_CUMPLIMIENTO) llega a `/admin/dashboard`; ve "Cumplimiento SIPPCI", NO ve "Profesionales" |
| 2 | Lista solicitudes Natural carga | Click "Solicitudes Natural" → `/admin/sippci/cumplimiento/solicitudes/natural`, ≥1 fila y visible `SIPPCI-NAT-2026-001` |
| 3 | Lista solicitudes Jurídica carga | `/admin/sippci/cumplimiento/solicitudes/juridica` muestra `SIPPCI-JUR-2026-001` |
| 4 | Expediente Digital muestra datos | `.../solicitudes/natural/SIPPCI-NAT-2026-002` muestra heading, "Panadería Doña Rosa" y nivel "ALTO" |
| 5 | Modal Observar abre y valida | Modal "Observar Solicitud" abre, acepta texto y cierra con Escape |
| 6 | Lista inspecciones carga | `/admin/sippci/cumplimiento/inspecciones` muestra heading "Inspecciones Técnicas" |
| 7 | Lista certificados emitidos carga | `/admin/sippci/cumplimiento/certificados` con ≥1 fila y `CERT-SIPPCI-2026-0001` |
| 8 | Reportes carga con 3 gráficos | `/admin/sippci/cumplimiento/reportes` muestra "Solicitudes por Estado", "Certificados por Mes" y "Nivel de Riesgo" |

## Notas

- Login pasa por `beforeEach` (Kerberos mock frontend + `POST /api/auth/kerberos/exchange`).
- Si el backend está caído, los 8 fallan en `beforeEach` (timeout esperando `/admin/dashboard`).
- Los tests son de lectura (no mutan datos), salvo el modal que se cierra sin confirmar.
