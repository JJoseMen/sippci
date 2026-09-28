# Estructura del Proyecto SIPPCI V2.0

**Última actualización:** 25/09/2026

## Raíz

Bomberos/
├── backend/          NestJS 10.4 + Prisma 5.22 + PostgreSQL
├── frontend/         React 19 + Vite 6 + TS 5.6 + Zustand + TanStack
├── docs/             20+ archivos .md
├── scripts/          dev.ps1, build.ps1, init.ps1
├── .gitignore
├── README.md
└── INFOME_FASE4.md

## Backend

backend/
├── prisma/
│   ├── schema.prisma        (23 modelos, 8 migraciones)
│   ├── migrations/
│   ├── seed.ts
│   ├── seed-profesionales.ts
│   └── seed-cumplimiento.ts
└── src/
    ├── common/              (guards, decorators, utils)
    ├── modules/             (18 módulos)
    │   ├── admin/
    │   ├── auth/
    │   ├── capacitaciones/
    │   ├── certificados/
    │   ├── cumplimiento/    ← FASE 2
    │   ├── declaraciones/
    │   ├── dev/
    │   ├── documentos/
    │   ├── empresas/
    │   ├── notificaciones/
    │   ├── pagos/
    │   ├── profesionales/   ← FASE 1
    │   ├── public/
    │   ├── renovaciones/
    │   ├── sippci/
    │   ├── solicitudes/
    │   └── usuarios/
    ├── app.module.ts
    └── main.ts

## Frontend

frontend/
├── e2e/
│   ├── profesionales.spec.ts    (7 tests)
│   └── cumplimiento.spec.ts     (8 tests)
├── public/
└── src/
    ├── components/
    │   ├── admin/         (5 componentes)
    │   ├── shared/        (9 componentes)
    │   └── ui/            (14 componentes base)
    ├── config/
    │   └── menu.config.tsx
    ├── features/
    ├── layouts/           (5 layouts)
    ├── lib/
    ├── pages/
    │   ├── admin/
    │   │   ├── cumplimiento/  ← FASE 2
    │   │   └── profesionales/ ← FASE 1
    │   ├── auth/
    │   ├── cajero/
    │   ├── ciudadano/
    │   ├── notificaciones/
    │   ├── oficial/
    │   └── public/
    ├── router/
    ├── services/
    ├── stores/
    └── types/

## Documentación clave

| Doc | Descripción |
|-----|-------------|
| README.md | Visión general |
| docs/API.md | Endpoints backend |
| docs/API_PROFESIONALES.md | Endpoints módulo Profesionales |
| docs/API_CUMPLIMIENTO.md | Endpoints módulo Cumplimiento |
| docs/BASE_DATOS.md | Modelos y enums |
| docs/MATRIZ_PROFESIONALES.md | Lógica módulo Profesionales |
| docs/MATRIZ_CUMPLIMIENTO.md | Lógica módulo Cumplimiento |
| docs/MODULO_PROFESIONALES.md | Módulo Profesionales completo |
| docs/MODULO_CUMPLIMIENTO.md | Módulo Cumplimiento completo |
| docs/RUTAS_ADMIN.md | Rutas del panel admin |
| docs/TESTING_PROFESIONALES.md | Tests Profesionales |
| docs/TESTING_CUMPLIMIENTO.md | Tests Cumplimiento |
| docs/PENDIENTES.md | Pendientes activos |

## Módulos implementados

| Módulo | Estado | Fase |
|--------|--------|------|
| Auth (OTP + Kerberos) | ✅ | 1-4 |
| Ciudadano (solicitudes, docs, pagos, notif) | ✅ | 4 |
| Admin / Oficial / Cajero | ✅ | 4 |
| Profesionales (NAT/JUR) | ✅ | 1 |
| Cumplimiento SIPPCI | ✅ | 2 |
| Capacitaciones | ⏳ | 3 (futuro) |
| Reglamentación | ⏳ | 4 (futuro) |
| Turismo | ⏳ | 5 (futuro) |
| Renovaciones | ⏳ | 6 (futuro) |
