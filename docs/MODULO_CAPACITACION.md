# 📘 MÓDULO CAPACITACIÓN — SIPPCI V2.0

## 1. Objetivo

Gestionar la inscripción, participación y certificación de capacitaciones obligatorias para la obtención/renovación de certificados SIPPCI y Registro Profesional. El módulo permite a ciudadanos inscribir participantes a cursos base y a gestores administrar cursos, programaciones y emitir certificados.

### Estado de fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| **3.0 — Cimientos** | `@Roles()` en controller + seed de 4 cursos base + documentación | ✅ **Completada** |
| **3.1 — Migración de tablas** | 4 tablas nuevas + 2 enums + 1 `@unique` | ✅ **Completada** |
| 3.2+ | CRUD, inscripciones, certificados, frontend, tests | ⬜ Pendiente |

---

## 2. Roles y permisos

| Rol | Permisos |
|-----|----------|
| **ADMIN** | Solo lectura (no modifica por ahora) |
| **GESTOR_CAPACITACIONES** | CRUD cursos, programaciones, instructores; aprobar participantes; emitir certificados; reportes |
| **GESTOR_CUMPLIMIENTO** | Solo lectura (listar cursos, ver participantes de sus solicitudes) |
| **GESTOR_REGISTRO_PROFESIONAL** | Solo lectura |
| **CAJERO** | Sin acceso |
| **Ciudadano (EXTERNO)** | Inscribir participantes a sus solicitudes en estado BORRADOR; subir lista Excel; ver sus participantes y costos |

> **Nota:** Fase 3.0 restringe los 7 endpoints actuales a `ADMIN` + `GESTOR_CAPACITACIONES` vía `@Roles()`. Desde 30/09/2026 `ADMIN` queda en **solo lectura**: solo los `GET` permiten `ADMIN`; los `POST`/`DELETE` permiten únicamente `GESTOR_CAPACITACIONES`. El acceso ciudadano se habilitará en FASE 3.2+ con endpoints dedicados (`/ciudadano/capacitaciones/*`).

---

## 3. Endpoints actuales (7 existentes)

Todos bajo prefix implícito `/capacitaciones` (sin prefix explícito en controller).

| # | Método | Ruta | Rol requerido | DTO Entrada | Respuesta |
|---|--------|------|---------------|-------------|-----------|
| 1 | GET | `/cursos` | ADMIN, GESTOR_CAPACITACIONES | — | `Curso[]` (solo `activo=true`) |
| 2 | POST | `/solicitudes/:codigo/participantes` | GESTOR_CAPACITACIONES | `CrearParticipanteDto` | `ParticipanteCapacitacion` |
| 3 | GET | `/solicitudes/:codigo/participantes` | ADMIN, GESTOR_CAPACITACIONES | `QueryParticipanteDto` (query) | Paginado `{ items, total, page, limit, pages }` |
| 4 | POST | `/solicitudes/:codigo/lista-excel` | GESTOR_CAPACITACIONES | `multipart/form-data` (file) | `{ creados, participantes[] }` |
| 5 | DELETE | `/participantes/:id` | GESTOR_CAPACITACIONES | — | `{ message }` |
| 6 | GET | `/solicitudes/:codigo/costo-total` | ADMIN, GESTOR_CAPACITACIONES | — | `{ total, participantes }` |

> **DTOs:**
> - `CrearParticipanteDto`: `{ nombreCompleto, carnet, email?, telefono?, cursos: string[] }`
> - `QueryParticipanteDto`: `{ page?, limit?, search?, estado? }`

---

## 4. Endpoints planificados (de MATRIZ_CAPACITACION.md sección 7)

| Endpoint | Existe | Fase | Notas |
|----------|--------|------|-------|
| **Cursos** | | | |
| GET `/cursos` | ✅ | 3.0 | Listar activos |
| POST `/cursos` | ❌ | DESCARTADO | ~~Crear curso (ADMIN)~~ |
| PUT `/cursos/:id` | ❌ | DESCARTADO | ~~Actualizar curso (ADMIN)~~ |
| DELETE `/cursos/:id` | ❌ | DESCARTADO | ~~Desactivar curso (ADMIN)~~ |
| **Instructores** | | | |
| GET `/instructores` | ❌ | 3.1 | Listar |
| POST `/instructores` | ❌ | 3.1 | Crear |
| PUT `/instructores/:id` | ❌ | 3.1 | Actualizar |
| DELETE `/instructores/:id` | ❌ | 3.1 | Eliminar |
| **Programaciones** | | | |
| GET `/programaciones` | ❌ | 3.2 | Listar con filtros |
| POST `/programaciones` | ❌ | 3.2 | Crear (GESTOR_CAPACITACIONES) |
| PUT `/programaciones/:id` | ❌ | 3.2 | Actualizar |
| DELETE `/programaciones/:id` | ❌ | 3.2 | Cancelar |
| POST `/programaciones/:id/inscribir` | ❌ | 3.2 | Inscribir participante (ciudadano/gestor) |
| PUT `/programaciones/:id/aprobar/:participanteId` | ❌ | 3.3 | Aprobar/Rechazar participación |
| **Certificados** | | | |
| POST `/certificados/emitir` | ❌ | 3.4 | Emitir certificado individual (PDF+QR) |
| POST `/certificados/emitir-lote` | ❌ | 3.4 | Emisión masiva por programación |
| GET `/certificados/:codigo/descargar` | ❌ | 3.4 | Descargar PDF |
| **Reportes** | | | |
| GET `/reportes/participantes-por-curso` | ❌ | 3.5 | |
| GET `/reportes/asistencia` | ❌ | 3.5 | |
| GET `/reportes/certificados-emitidos` | ❌ | 3.5 | |

> **Nota Cursos:** Los 4 cursos son fijos. No se permite CRUD de cursos.

---

## 5. Modelo de datos actual

### Tablas existentes (Prisma)

```prisma
model cursos {
  id            Int       @id @default(autoincrement())
  nombre        String    @unique // ✅ FASE 3.1 — constraint añadido (migración add_unique_curso_nombre)
  descripcion   String?
  modalidad     String    @default("PRESENCIAL") // PRESENCIAL, VIRTUAL, HIBRIDO
  duracionHoras Int?
  costoBsf      Decimal?  @db.Decimal(10, 2)
  activo        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  participantes participantes_capacitacion[]
  participantesCursos participantes_cursos[]
}

model participantes_capacitacion {
  id                 Int      @id @default(autoincrement())
  cursoId            Int?     // Legacy: curso único (no usado en flujo actual)
  solicitudId        Int?     // Vincula a solicitud CAPACITACION
  nombre             String
  ci                 String
  email              String?
  telefono           String?
  estado             EstadoParticipante @default(INSCRITO)
  certificadoEmitido Boolean  @default(false)
  createdAt          DateTime @default(now())
  curso              cursos?  @relation(fields: [cursoId], references: [id])
  solicitud          solicitudes? @relation(fields: [solicitudId], references: [id])
  relaciones         participantes_cursos[]
}

model participantes_cursos {
  id               Int      @id @default(autoincrement())
  participanteId   Int
  cursoId          Int
  estado           EstadoParticipante @default(INSCRITO)
  fechaInscripcion DateTime @default(now())
  participante     participantes_capacitacion @relation(fields: [participanteId], references: [id], onDelete: Cascade)
  curso            cursos @relation(fields: [cursoId], references: [id], onDelete: Cascade)
  @@unique([participanteId, cursoId])
}
```

### FASE 3.1 — Tablas nuevas (✅ creadas)

Migración `20260930160000_add_capacitacion_tables` — **solo adiciones**, nada eliminado ni modificado:

| Tabla | Propósito | Índices / constraints |
|-------|-----------|----------------------|
| `instructores` | Datos de instructores (CI, nombre, especialidad, habilitado) | `ci` **@unique**, `@@index([activo])` |
| `programacion_curso` | Fechas, cupo, instructor, lugar, estado | FK→`cursos`, FK→`instructores`, índices `cursoId`/`instructorId`/`estado` |
| `participante_programacion` | Inscripción a una programación: puntaje, aprobado, asistencia, certificado | **@@unique([programacionId, participanteId])**, índices `participanteId`/`certificadoId` |
| `certificado_capacitacion` | Certificados tipo CAPACITACION con QR, PDF, vigencia, estado | `codigo` **@unique**, FK→`cursos`, FK→`instructores`, índices `participanteId`/`programacionId`/`estado` |

**Enums nuevos:**

```prisma
enum EstadoProgramacion {
  PROGRAMADO   // creado, pendiente de iniciar
  EN_CURSO     // en ejecución
  FINALIZADO   // terminado
  CANCELADO    // cancelado
  REPROGRAMADO // movido a otra fecha
}

enum EstadoCertificadoCapacitacion {
  EMITIDO   // vigente
  VENCIDO   // pasó vigenciaHasta
  REVOCADO  // anulado manualmente
}
```

**Migración 1 (FASE 3.1):** `20260930150000_add_unique_curso_nombre` → `CREATE UNIQUE INDEX "cursos_nombre_key" ON "cursos"("nombre")`.

#### Decisiones conservadoras de la FASE 3.1

1. **Cursos fijos, sin CRUD** — se mantienen los 4 cursos base (`EXTINTORES`, `PRIMEROS_AUXILIOS`, `EVACUACION`, `TRABAJOS_EN_ALTURA`). No se crean `POST/PUT/DELETE /cursos`.
2. **`participantes_capacitacion.cursoId` se mantiene (legacy)** — no se elimina ni se depreta; sigue soportando el flujo actual de inscripción N:M vía `participantes_cursos`. La nueva cadena es `programacion_curso` → `participante_programacion`.
3. **Doble seed se mantiene** — `seed.ts` (principal, intocable) + `seed-capacitaciones.ts` (idempotente, ajusta valores de los 4 cursos). Sin cambios en ninguno de los dos.
4. **Prefijo del controller NO se cambia** — sigue siendo `@Controller()` sin prefijo, exponiendo `/api/cursos`, `/api/solicitudes/:codigo/participantes`, etc. El frontend consume exactamente esas URLs (`frontend/src/services/capacitaciones.service.ts`). Cambiarlo a `admin/capacitaciones` rompería el frontend; queda pendiente junto al ajuste de rutas.
5. **Solo adiciones** — no se modificaron columnas existentes ni se eliminó nada; `cursos` solo recibió el constraint `@unique` sobre un campo ya sin duplicados (verificado previamente: 0 duplicados).

> **Nota:** El modelo `participantes_capacitacion` usa `cursoId` opcional (legacy) y relación N:M vía `participantes_cursos`. La cadena nueva sobre `programacion_curso` **coexiste**; unificarla es trabajo futuro (no se hizo en 3.1 para no romper nada).

---

## 6. Flujo del proceso

(Copiado de MATRIZ_CAPACITACION.md sección 5)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CIUDADANO crea solicitud tipo CAPACITACION (estado BORRADOR)  │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CIUDADANO agrega participantes (POST /participantes o        │
│    sube Excel POST /lista-excel)                                │
│    → Valida: solicitud propia, estado BORRADOR, cursos válidos  │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CIUDADANO envía solicitud (cambio estado → ENVIADA)          │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. GESTOR_CAPACITACIONES revisa y APRUEBA solicitud             │
│    → Crea programacion_curso (fecha, cupo, instructor, sede)    │
│    → Cambia estado participantes a APROBADO                     │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. PARTICIPANTE asiste a capacitación (presencial/virtual)      │
│    → GESTOR registra asistencia (ASISTIO / NO_ASISTIO)          │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. GESTOR emite certificado (POST /certificados/emitir)         │
│    → Genera PDF + QR + hash                                     │
│    → Marca certificadoEmitido = true                            │
│    → Cambia estado solicitud → CERTIFICADO_EMITIDO              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Deuda técnica / pendientes

| Item | Estado | Fase objetivo |
|------|--------|---------------|
| `@Roles()` en controller | ✅ Resuelto (FASE 3.0) | 3.0 |
| Seed de 4 cursos base | ✅ Resuelto (FASE 3.0) | 3.0 |
| Tablas `instructores`, `programacion_curso`, `participante_programacion`, `certificado_capacitacion` + 2 enums | ✅ Resuelto (FASE 3.1) | 3.1 |
| `@unique` en `cursos.nombre` | ✅ Resuelto (FASE 3.1) | 3.1 |
| CRUD `instructores` (endpoints) | ❌ Pendiente — tabla creada, sin endpoints | 3.1 |
| CRUD `programacion_curso` (endpoints) | ❌ Pendiente — tabla creada, sin endpoints | 3.1 |
| POST/PUT/DELETE `/cursos` | ❌ Descartado (decisión conservadora: cursos fijos) | — |
| Servicios/DTOs para las tablas nuevas | ❌ Pendiente | 3.2 |
| Aprobación manual participantes | ❌ Pendiente | 3.2 |
| Certificados PDF+QR (tipo CAPACITACION) | ❌ Pendiente | 3.4 |
| Páginas frontend (0 actualmente) | ❌ Pendiente | 3.6+ |
| Router frontend (sin rutas) | ❌ Pendiente | 3.6+ |
| Tests unitarios/e2e de capacitación (0) | ❌ Pendiente | 3.5 |
| Renovación capacitación (no definida) | ❌ Pendiente | 3.7+ |
| Endpoints ciudadanos dedicados (`/ciudadano/capacitaciones/*`) | ❌ Pendiente | 3.2 |
| Unificar `participantes_capacitacion.cursoId` (legacy) con `programacion_curso` | ❌ Pendiente — se conserva legacy | 3.2+ |
| Prefijo de rutas `admin/capacitaciones` | ❌ Pendiente — rompería el frontend si se cambia solo | 3.2+ |

---

## 8. Entorno reproducible

Cualquier persona debe poder reconstruir la BD de desarrollo desde cero y que los 16 tests E2E pasen sin intervención manual.

### Resetear la BD

```bash
cd backend
npx prisma migrate reset --force
```

> ⚠️ **ADVERTENCIA: `prisma migrate reset` BORRA TODOS LOS DATOS.**
> Elimina el esquema completo y lo vuelve a crear desde las migraciones.
> **Hacer un backup antes de cada reset** (ver §Backup más abajo).

### Cargar los seeds

```bash
cd backend
npx prisma db seed
```

`prisma db seed` ejecuta, **en este orden**, los 5 seeds registrados en `backend/package.json`:

| # | Seed | Qué crea |
|---|------|----------|
| 1 | `prisma/seed.ts` | usuarios internos, empresa base, usuario demo, 4 cursos, `SIPPCI-2026-0001` |
| 2 | `prisma/seed-cumplimiento.ts` | `SIPPCI-NAT-2026-001/002/003`, `SIPPCI-JUR-2026-001/002`, `CERT-SIPPCI-2026-0001` |
| 3 | `prisma/seed-profesionales.ts` | `SOL-NAT-2026-001/002/003`, `SOL-JUR-2026-001/002`, ciudadano y empresa propios |
| 4 | `prisma/seed-capacitaciones.ts` | 4 cursos base (sobreescribe los de `seed.ts`) |
| 5 | `prisma/seed-e2e-fixtures.ts` | `CERT-2026-0001` + estados `CERTIFICADO_EMITIDO` que el E2E asume |

**El orden importa**: `seed-e2e-fixtures.ts` depende de que existan las solicitudes y los `usuarios_internos` creados por los seeds 1–3.

### Verificar

```bash
cd frontend
npx playwright test --reporter=list
```

Resultado esperado: **16/16** (9 de `cumplimiento.spec.ts` + 7 de `profesionales.spec.ts`).

### Datos que solo crea `seed-e2e-fixtures.ts`

Ningún otro seed genera estos datos; sin él, los tests **fallan**:

- `CERT-2026-0001` (tipo `PROFESIONAL`) → tests *profesionales 5* y *profesionales 6*.
- `CERT-SIPPCI-2026-0002` → resuelve la inconsistencia de `SIPPCI-JUR-2026-002` (estado `CERTIFICADO_EMITIDO` sin certificado).
- Estados `CERTIFICADO_EMITIDO` de `SIPPCI-JUR-2026-002`, `SIPPCI-NAT-2026-003` y `SOL-NAT-2026-003` → test *cumplimiento 9*.

El seed es **idempotente**: correrlo N veces no duplica filas ni altera fechas ya emitidas.

### Backup

```bash
powershell -File scripts/backup-db.ps1
```

Genera `C:\backups\sippci_<fecha>.sql`. Usar `pg_dump` de **PostgreSQL 17, puerto 5433**.

---

## 9. Referencias

- `docs/MATRIZ_CAPACITACION.md` — ⚠️ **No existe en el repo** (referenciada en las tareas; ausente desde FASE 3.0). Las especificaciones se tomaron del enunciado de cada fase.
- `docs/RUTAS_ADMIN.md` — Rutas admin unificadas
- `backend/src/modules/capacitaciones/` — Código del módulo
- `backend/prisma/schema.prisma` — Modelos de datos
- `backend/prisma/seed-capacitaciones.ts` — Seed de cursos base
- `backend/prisma/migrations/20260930150000_add_unique_curso_nombre/` — `@unique` en `cursos.nombre`
- `backend/prisma/migrations/20260930160000_add_capacitacion_tables/` — 4 tablas + 2 enums