# SIPPCI — Sistema de Prevención y Protección Contra Incendios

## Descripción

Plataforma integral para la gestión de trámites de la Dirección Nacional de Bomberos (DNB) — Policía Boliviana.

## Stack

- Backend: NestJS 10.4 + Prisma 5.22 + PostgreSQL 16.10
- Frontend: React 19 + Vite 6 + TypeScript 5.6
- Estado: Zustand 5 + TanStack Query
- Formularios: React Hook Form + Zod
- Router: React Router 7
- Tablas: TanStack Table
- Estilos: CSS Modules + SCSS

## Estructura

```
SIPPCI/
├── backend/          # NestJS + Prisma
├── frontend/         # React + Vite
├── docs/             # Documentación
├── scripts/          # Scripts PowerShell
└── README.md
```

## Requisitos

- Node.js 20+
- PostgreSQL 16+
- npm 10+

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url>
cd SIPPCI
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con DATABASE_URL
npx prisma migrate dev
npx prisma db seed
npm run build
npm run start:dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Levantar todo

```bash
.\scripts\dev.ps1
```

## URLs

- Backend: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs
- Frontend: http://localhost:5173

## Base de datos

- 23 modelos + `_prisma_migrations`
- 8 migraciones: `init`, `add_revisado_estado`, `add_renovacion_fields`, `add_fecha_entrega`, `add_5_roles`, `add_tipo_documento_values`, `add_declaracion_jurada_v2`, `add_estados_inspeccion`
- 14 estados en `EstadoSolicitud`
- 18 controllers

## Autenticación

- Externos: email + password + OTP
- Internos: Kerberos mock (`KERBEROS_MOCK_MODE=true`)
- Roles: ADMIN, OFICIAL, CAJERO

## Hallazgos y pendientes

- SMTP sin configurar (OTP sale por consola `[DEV]`)
- 8 warnings de lint (variables sin usar)
- Placeholders `pages/public/Login|Register` (eliminados)
- Migración Sass pendiente (`@import` → `@use`)
- Registro JURIDICA crea empresa + vínculo `usuarios_empresas` (corregido)

## Credenciales de prueba

- Admin: http://localhost:5173/kerberos/callback?ticket=mock-ticket-admin
- Oficial: http://localhost:5173/kerberos/callback?ticket=mock-ticket-oficial
- Cajero: http://localhost:5173/kerberos/callback?ticket=mock-ticket-cajero

## Documentación adicional

- `docs/API.md`
- `docs/BASE_DATOS.md`
- `docs/INSTALACION.md`
- `docs/LINT_WARNINGS.md`
- `docs/PENDIENTES.md`

## Autor

[Juan Jose Mendoza Condori]

## Licencia

[Universiadad Publica de El Alto(D.N.T.T.)]