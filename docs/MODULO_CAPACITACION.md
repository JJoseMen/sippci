# 📘 MÓDULO CAPACITACIÓN — SIPPCI V2.0

## 1. Objetivo

Gestionar la inscripción, participación y certificación de capacitaciones obligatorias para la obtención/renovación de certificados SIPPCI y Registro Profesional. El módulo permite a ciudadanos inscribir participantes a cursos base y a gestores administrar cursos, programaciones y emitir certificados.

### Estado de fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| **3.0 — Cimientos** | `@Roles()` en controller + seed de 4 cursos base + documentación | ✅ **Completada** |
| **3.1 — Migración de tablas** | 4 tablas nuevas + 2 enums + 1 `@unique` | ✅ **Completada** |
| **3.2 — Backend Instructores** | CRUD `/instructores` + 3 DTOs | ✅ **Completada** |
| **3.3.A — Backend Programaciones** | CRUD `/programaciones` + transiciones de estado | ✅ **Completada** |
| **3.3.B — Backend Participantes** | Inscripción/desinscripción + catálogo de participantes | ✅ **Completada** |
| **3.3.C — Frontend** | Programaciones (listado/detalle/modales) + Participantes | ✅ **Completada** |
| **3.3.D — Frontend Instructores** | Listado, alta/edición y desactivación de instructores | ✅ **Completada** |
| **3.4 — Aprobación de participantes** | Botones Aprobar/Reprobar, validación de programación, justificación al corregir; se eliminaron `asistencia` y `ABANDONO` | ✅ **Completada** |
| 3.4.B+ | Certificados PDF+QR, reportes, formulario ciudadano | ⬜ Pendiente |

> **Nota (FASE 3.4):** los cursos son de **una sola sesión**, por lo que se
> eliminaron de raíz la columna `participante_programacion.asistencia` y el
> valor `ABANDONO` del enum `EstadoParticipante`. `puntaje` se conserva en BD
> como **deuda futura**: no se edita desde la UI.

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

## 3. Endpoints legacy — `CapacitacionesController` (6 existentes, sin prefijo)

Todos bajo prefix implícito `/capacitaciones` (sin prefix explícito en controller).
**No se tocaron** en las fases 3.2/3.3; el frontend legacy los consume tal cual.

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

## 4. Endpoints del módulo — estado real

Base: `/api/admin/sippci/capacitaciones` (prefijo compartido por `InstructoresController`,
`ProgramacionesController` y `ParticipantesController`).

| Endpoint | Existe | Fase | Notas |
|----------|--------|------|-------|
| **Cursos** | | | |
| GET `/cursos` | ✅ | 3.0 | Listar activos (controller legacy) |
| POST `/cursos` | ❌ | DESCARTADO | ~~Crear curso (ADMIN)~~ |
| PUT `/cursos/:id` | ❌ | DESCARTADO | ~~Actualizar curso (ADMIN)~~ |
| DELETE `/cursos/:id` | ❌ | DESCARTADO | ~~Desactivar curso (ADMIN)~~ |
| **Instructores** | | | |
| GET `/instructores` | ✅ | 3.2 | Listar: `search`, `activo`, paginación |
| GET `/instructores/:id` | ✅ | 3.2 | Obtener por id |
| POST `/instructores` | ✅ | 3.2 | Crear; CI repetido → 409 |
| PUT `/instructores/:id` | ✅ | 3.2 | Actualizar; CI duplicado → 409 |
| DELETE `/instructores/:id` | ✅ | 3.2 | **Soft delete**: `activo = false` (no borra filas) |
| **Programaciones** | | | |
| GET `/programaciones` | ✅ | 3.3.A | Filtros `search`, `estado`, `cursoId`, `instructorId`, `desde`, `hasta` |
| GET `/programaciones/:id` | ✅ | 3.3.A | Trae `curso`, `instructor` y `_count.participantes` |
| POST `/programaciones` | ✅ | 3.3.A | Crea en `PROGRAMADO`; el instructor debe existir y estar activo |
| PUT `/programaciones/:id` | ✅ | 3.3.A | Bloqueado si está `FINALIZADO` o `CANCELADO` |
| PUT `/programaciones/:id/reprogramar` | ✅ | 3.3.A | Cambia fechas + estado → `REPROGRAMADO` |
| PUT `/programaciones/:id/cancelar` | ✅ | 3.3.A | Transición a `CANCELADO` |
| PUT `/programaciones/:id/iniciar` | ✅ | 3.3.A | `PROGRAMADO` → `EN_CURSO` |
| PUT `/programaciones/:id/finalizar` | ✅ | 3.3.A | `EN_CURSO` → `FINALIZADO` |
| DELETE `/programaciones/:id` | ➖ | — | No existe a propósito: la baja es por `cancelar` |
| **Participantes — inscripción en una programación** | | | |
| GET `/programaciones/:id/participantes` | ✅ | 3.3.B | Filtros `search`, `estado`, `aprobado` + paginación (`asistencia` eliminado en 3.4) |
| POST `/programaciones/:id/participantes` | ✅ | 3.3.B | Valida estado apto (`PROGRAMADO`/`REPROGRAMADO`), cupo y duplicado → 409 |
| PUT `/programaciones/:id/participantes/:participanteId/estado` | ✅ | 3.3.B / **3.4** | `estado`, `aprobado`, `puntaje`, `observaciones`, `justificacion`. Requiere programación `EN_CURSO`/`FINALIZADO`; bloquea con certificado emitido; `APROBADO`⇒`aprobado=true`, `REPROBADO`⇒`aprobado=false` |
| DELETE `/programaciones/:id/participantes/:participanteId` | ✅ | 3.3.B | Desinscribir; bloqueado si ya hay certificado |
| **Participantes — catálogo** | | | |
| GET `/participantes` | ✅ | 3.3.B | Catálogo: `search`, `estado`, paginación |
| POST `/participantes` | ✅ | 3.3.B | Crear en el catálogo; CI repetido → 409 |
| **Certificados** (base `/api/admin/sippci/capacitaciones/certificados`) | | | |
| GET `/certificados` | ✅ | 3.4.B | Listado: `search`, `estado`, `desde`, `hasta`, paginación. Roles: GESTOR + ADMIN |
| POST `/certificados/emitir` | ✅ | 3.4.B | Individual. Programación `EN_CURSO`/`FINALIZADO` + participante `APROBADO` + sin certificado (409 si ya existe). GESTOR |
| POST `/certificados/emitir-lote` | ✅ | 3.4.B | Emisión masiva de los aprobados sin certificado. Devuelve `{emitidos, codigos, errores}`. GESTOR |
| GET `/certificados/:codigo/descargar` | ✅ | 3.4.B | PDF (`application/pdf`); regenera el archivo si falta en disco. Roles: GESTOR + ADMIN |
| GET `/public/validar-certificado-capacitacion/:codigo` | ✅ | 3.4.B | **Sin autenticación**. `{valido, vencido, participante, curso, programacion, instructor, ...}` |
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
| `participante_programacion` | Inscripción a una programación: puntaje, aprobado, certificado (`asistencia` eliminada en 3.4) | **@@unique([programacionId, participanteId])**, índices `participanteId`/`certificadoId` |
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

**Enum de participantes (estado actual tras FASE 3.4):**

```prisma
enum EstadoParticipante {
  INSCRITO   // pendiente de resultado
  APROBADO   // aprobado manualmente por el gestor
  REPROBADO  // reprobado manualmente por el gestor
  // ❌ ABANDONO eliminado en FASE 3.4 (curso de una sola sesión)
}
```

### FASE 3.4 — Migraciones de aprobación (✅ aplicadas)

| Migración | Qué hace |
|-----------|----------|
| `20261002013137_remove_asistencia_participante` | `ALTER TABLE "participante_programacion" DROP COLUMN "asistencia";` |
| `20261002013300_remove_abandono_estado_participante` | Recrea el enum `EstadoParticipante` sin `ABANDONO` y convierte **ambas** columnas que lo usan: `participantes_capacitacion.estado` y `participantes_cursos.estado` (PostgreSQL no permite borrar un valor de un ENUM; además hay que dropear/restaurar el `DEFAULT 'INSCRITO'`, que estaba tipado con el tipo viejo). |

Verificado antes de migrar: `0` filas con `estado = 'ABANDONO'` y `0` filas con
`asistencia IS NOT NULL`.

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
│ 5. GESTOR aprueba/reprueba participantes (curso de 1 sesión)    │
│    → PUT /programaciones/:id/participantes/:pid/estado          │
│    → Solo en programación EN_CURSO o FINALIZADO                 │
│    → APROBADO ⇒ aprobado=true / REPROBADO ⇒ aprobado=false      │
│    → Corregir un resultado previo exige justificación           │
│    → NO hay asistencia ni ABANDONO (FASE 3.4)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. GESTOR emite certificado (POST /certificados/emitir)         │
│    → Genera PDF + QR + hash                                     │
│    → Solo para participantes en estado APROBADO                 │
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
| CRUD `instructores` (endpoints) | ✅ Resuelto (FASE 3.2) | 3.1 |
| CRUD `programacion_curso` (endpoints) | ✅ Resuelto (FASE 3.3.A) | 3.1 |
| Inscripción / desinscripción + catálogo de participantes | ✅ Resuelto (FASE 3.3.B) | 3.3.B |
| Servicios/DTOs para las tablas nuevas | ✅ Resuelto (FASE 3.3.A / 3.3.B) | 3.2 |
| Aprobación manual participantes | ✅ Resuelto (FASE 3.3.B, **pulido en FASE 3.4**) — vía `PUT .../participantes/:pid/estado` (sin endpoints dedicados `aprobar`/`reprobar`) | 3.2 |
| Frontend Programaciones (listado, detalle, modales) | ✅ Resuelto (FASE 3.3.C) | 3.6+ |
| Frontend Participantes (catálogo, inscripción, edición) | ✅ Resuelto (FASE 3.3.C) | 3.7+ |
| Frontend Instructores (listado, alta/edición, desactivación) | ✅ Resuelto (FASE 3.3.D) | 3.6+ |
| **Bug: el backdrop del `Modal` compartido tapaba el diálogo** | ✅ Resuelto — `src/components/ui/Modal/Modal.module.scss` (`.dialog` ahora es `position: relative; z-index: 51`). Estaba desde el commit inicial y **ningún click dentro de ningún modal llegaba a su botón** (afectaba a Cumplimiento/Profesionales también); ningún E2E anterior hacía click dentro de un modal, por eso nunca se detectó. | — |
| Router frontend (rutas de capacitación) | ✅ Resuelto (FASE 3.3.C / 3.3.D) | 3.6+ |
| Tests e2e de capacitación | ✅ Resuelto — `frontend/e2e/capacitaciones.spec.ts` | 3.5 |
| POST/PUT/DELETE `/cursos` | ❌ Descartado (decisión conservadora: cursos fijos) | — |
| Certificados PDF+QR (tipo CAPACITACION) | ❌ Pendiente | 3.4.B |
| Reportes de capacitación | ❌ Pendiente | 3.5 |
| Formulario ciudadano / catálogo público | ❌ Pendiente | 3.9 |
| Reactivar instructor (soft delete reversible) | ✅ Resuelto — `ActualizarInstructorDto` **sí acepta** `activo` (solo API/tests; la UI no expone la opción) | 3.4+ |
| Renovación capacitación (no definida) | ❌ Pendiente | 3.7+ |
| Endpoints ciudadanos dedicados (`/ciudadano/capacitaciones/*`) | ❌ Pendiente | 3.2 |
| Unificar `participantes_capacitacion.cursoId` (legacy) con `programacion_curso` | ❌ Pendiente — se conserva legacy | 3.2+ |
| Prefijo de rutas `admin/capacitaciones` | ⚠️ Parcial — los controllers nuevos ya usan el prefijo; `CapacitacionesController` (legacy) sigue sin él | 3.2+ |
| Submenús anidados en `AdminSidebar` para ADMIN | ❌ Pendiente — bug preexistente; el menú ADMIN de capacitación son enlaces planos | 3.4+ |
| Seed de fixtures de capacitación (programaciones, participantes, instructores) | ✅ Resuelto (FASE 3.3) — `backend/prisma/seed-capacitaciones-completo.ts` (idempotente, **fuera** de `prisma db seed`; ver §8) | 3.4+ |
| **Aprobación de participantes (pulido)** | ✅ Resuelto (FASE 3.4) — botones Aprobar/Reprobar, validación de programación, justificación al corregir; `asistencia` y `ABANDONO` eliminados | 3.4 |
| Aprobación por lote | ❌ Pendiente — decisión: individual en 3.4, lote en fase futura | 3.6+ |
| Edición de `puntaje` desde la UI | ❌ Pendiente — la columna existe en BD y el DTO la acepta; la UI no la expone | 3.6+ |
| Filtro/listado de aprobados-reprobados (`GET /reportes/aprobados-reprobados`) | ❌ Pendiente | 3.5 |

---

## 8. Entorno reproducible

Cualquier persona debe poder reconstruir la BD de desarrollo desde cero y correr los **35** tests E2E.
**Falta un paso manual**: los fixtures de capacitación listados más abajo (§*Fixtures*) no
los crea `prisma db seed`; se cargan con `npx ts-node prisma/seed-capacitaciones-completo.ts`
(deuda registrada en §7).

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

Resultado esperado: **30/30** (14 de `capacitaciones.spec.ts` + 9 de `cumplimiento.spec.ts` + 7 de `profesionales.spec.ts`).

### Fixtures de capacitación que NO crea ningún seed ⚠️

Los tests 2, 6, 11, 13 y 14 de `capacitaciones.spec.ts` asumen datos que se
crearon **a mano por la API** durante las fases 3.3.A–3.3.D y que `prisma db seed`
**no regenera**. Tras un `migrate reset` esos tests fallan hasta volver a crearlos:

| Tabla | Filas esperadas |
|-------|-----------------|
| `programacion_curso` | 4: `#1` CANCELADO, `#2` FINALIZADO (cupo 15, `Aula 2`), `#3` REPROGRAMADO (cupo 12, `Salon B`, 2 inscritos), `#4` PROGRAMADO (cupo 2, `Aula Test Cupo`) |
| `participantes_capacitacion` (catálogo) | 6: Juan Perez, Maria Lopez, Carlos Garcia, Ana Torres, Luis Mamani, Rosa Quispe Mamani |
| `participante_programacion` | `#3` → Ana Torres + Luis Mamani; `#4` → 1 inscrito |
| `instructores` | 3 activos: Marco Antonio Vargas Peña (CI 5123456), Carla Fernanda Rojas Mamani (CI 5234567), Diego Alonzo Quispe Ticona (CI 5345678) |

> El test 13 crea **un instructor nuevo por ejecución** (CI autogenerado) y lo
> desactiva al final, así que la tabla `instructores` acumula una fila inactiva
> por corrida. Mover todo esto a `prisma/seed-capacitaciones-fixtures.ts` es
> deuda pendiente (ver §7).

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

- `docs/MATRIZ_CAPACITACION.md` — Matriz técnica del módulo (existe; se actualizó en FASE 3.3).
- `docs/RUTAS_ADMIN.md` — Rutas admin unificadas
- `backend/src/modules/capacitaciones/` — Código del módulo
  (`instructores.*`, `programaciones.*`, `participantes.*` y el `capacitaciones.controller.ts` legacy)
- `frontend/src/pages/admin/capacitaciones/` — Páginas, modales y estilos del frontend
- `frontend/src/services/instructores.service.ts` y `programaciones.service.ts` — Clientes HTTP
- `frontend/e2e/capacitaciones.spec.ts` — Suite E2E del módulo
- `backend/prisma/schema.prisma` — Modelos de datos
- `backend/prisma/seed-capacitaciones.ts` — Seed de cursos base
- `backend/prisma/migrations/20260930150000_add_unique_curso_nombre/` — `@unique` en `cursos.nombre`
- `backend/prisma/migrations/20260930160000_add_capacitacion_tables/` — 4 tablas + 2 enums