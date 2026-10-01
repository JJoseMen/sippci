# 📋 MATRIZ TÉCNICA — MÓDULO CAPACITACIÓN SIPPCI

**Proyecto:** SIPPCI V2.0
**Módulo:** SIPPCI → Capacitación
**Fecha:** 30/09/2026
**Autor:** Juan José Mendoza Condori (rodri)
**Estado:** Definición aprobada — En implementación

---

## 1. 🎯 Objetivo

Gestionar la capacitación de personas naturales y jurídicas (empresas) en
materia de prevención y protección contra incendios, con 4 cursos base:
Manejo de Extintores, Primeros Auxilios, Procedimiento Evacuación y
Trabajo de Altura.

Vigencia del certificado: 2 años.

---

## 2. 👥 Roles con acceso

| Rol | Acceso |
|-----|--------|
| ADMIN | Solo lectura (no modifica por ahora) |
| GESTOR_CAPACITACIONES | Control total del módulo |
| INSTRUCTOR | ❌ No accede al sistema |
| Ciudadano/Empresa | ✅ Formulario de inscripción desde su dashboard |
| Otros roles | ❌ |

---

## 3. 🗂️ Estructura del Sidebar

### Para GESTOR_CAPACITACIONES

📊 Dashboard
🎓 Capacitación
│
├── 📥 Solicitudes
│   ├── Persona Natural
│   └── Persona Jurídica
│
├── 👥 Personas
│   ├── Instructores
│   └── Participantes
│
├── 📚 Cursos
│   ├── Catálogo (4 cursos)
│   ├── Programar
│   └── Reprogramar
│
├── 📝 Puntajes
├── 📜 Certificados
└── 📊 Reportes

🔔 Notificaciones

### Para ADMIN

Igual pero con acceso a Administración, Usuarios, Auditoría (solo lectura).

---

## 4. 🛣️ Rutas Únicas

| Ruta | Vista | Rol |
|------|-------|-----|
| `/admin/sippci/capacitaciones/dashboard` | Dashboard | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/solicitudes/natural` | Lista Natural | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/solicitudes/natural/:codigo` | Expediente Natural | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/solicitudes/juridica` | Lista Jurídica | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/solicitudes/juridica/:codigo` | Expediente Jurídica | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/instructores` | Lista Instructores | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/instructores/crear` | Crear Instructor | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/instructores/:id/editar` | Editar Instructor | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/participantes` | Lista Participantes | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/participantes/subir-lista` | Subir Lista Excel | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/participantes/descargar` | Descargar Lista | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/participantes/aprobados-reprobados` | Aprobados/Reprobados | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/cursos` | Catálogo (4 cursos) | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/programaciones` | Lista Programaciones | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/programaciones/nueva` | Programar Curso | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/programaciones/:id` | Detalle Programación | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/programaciones/:id/reprogramar` | Reprogramar | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/puntajes` | Puntajes | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/puntajes/subir` | Subir Puntajes | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/certificados` | Certificados Emitidos | ADMIN, GESTOR_CAPACITACIONES |
| `/admin/sippci/capacitaciones/reportes` | Reportes | ADMIN, GESTOR_CAPACITACIONES |

### Rutas públicas

| Ruta | Vista | Rol |
|------|-------|-----|
| `/ciudadano/capacitaciones` | Catálogo + formulario | Ciudadano/Empresa logueado |
| `/validar-certificado-capacitacion/:codigo` | Validación pública | Público |

---

## 5. 🔄 Flujo del Proceso

BORRADOR          Ciudadano/Empresa (logueado) llena formulario
                  → se crea solicitud tipo CAPACITACION
                  → se agregan participantes (uno o varios)
                  → un participante puede inscribirse a varios cursos

ENVIADA           La solicitud llega al dashboard del GESTOR_CAPACITACIONES

EN_REVISION       GESTOR revisa documentación y participantes
                  ├─ OBSERVADA  Falta algo → vuelve al solicitante
                  └─ APROBADA   Todo OK → habilita programación

PROGRAMACION      GESTOR crea programación:
                  ├─ Asigna instructor
                  ├─ Define fecha/lugar/cupo
                  └─ Asigna participantes
                  [INSTRUCTOR dicta la clase — fuera del sistema]
                  [INSTRUCTOR entrega lista de aprobados/reprobados al gestor]

APROBACION        GESTOR marca manualmente cada participante:
                  ├─ ✅ Aprobar  → estado APROBADO
                  └─ ❌ Reprobar → estado REPROBADO

CERTIFICADO       GESTOR emite certificados a los aprobados
                  → PDF + QR propio (tabla propia)
                  → vigencia 2 años

CERTIFICADO_EMITIDO

VENCIDO (2 años después) — Renovación: pendiente de definir

---

## 6. 🗄️ Modelo de Datos

### Reutiliza lo existente:

#### solicitudes
- tipoTramite: 'CAPACITACION'
- subtipoTramite: 'NATURAL' | 'JURIDICA'
- datosJson con datos del solicitante

#### cursos
- 4 cursos fijos: EXTINTORES, PRIMEROS_AUXILIOS, EVACUACION, TRABAJOS_EN_ALTURA
- Campos: nombre, descripcion, modalidad, duracionHoras, costoBsf, activo

#### participantes_capacitacion
- Vinculados a una solicitud
- Estado: INSCRITO | APROBADO | REPROBADO | ABANDONO
- Campo certificadoEmitido boolean

#### participantes_cursos (N:M)
- Relación participante ↔ curso
- Estado propio por curso

#### historial_solicitudes

### Tablas nuevas (creadas en FASE 3.1):

#### instructores
- id, nombre, apellido, ci (unique), email, telefono, especialidad, activo
- createdAt, updatedAt

#### programacion_curso
- id, cursoId, instructorId
- fechaInicio, fechaFin, lugar, cupo
- estado: PROGRAMADO | EN_CURSO | FINALIZADO | CANCELADO | REPROGRAMADO
- observaciones String?
- createdAt, updatedAt

#### participante_programacion
- id, programacionId, participanteId
- puntaje, aprobado, asistencia
- certificadoId
- observaciones String?
- createdAt, updatedAt

#### certificado_capacitacion (TABLA NUEVA — NO reutiliza certificados)
- id, codigo (CERT-CAP-YYYY-NNNN unique)
- participanteId, programacionId, cursoId, instructorId
- emitidoEn, vigenciaHasta (emisión + 2 años)
- rutaPdf, qrUrl
- emitidoPorId
- estado: EMITIDO | VENCIDO | REVOCADO

---

## 7. 🛠️ Endpoints Backend

Base: /api/admin/sippci/capacitaciones

**⚠️ Estado actual de rutas (verificado 30/09/2026):**
- `InstructoresController` usa el prefijo `/api/admin/sippci/capacitaciones`
  (consistente con Profesionales y Cumplimiento).
- `CapacitacionesController` NO tiene prefijo → rutas planas
  (`/api/cursos`, `/api/solicitudes/:codigo/participantes`,
  `/api/participantes/:id`, `/api/solicitudes/:codigo/costo-total`).
- **Deuda:** unificar `CapacitacionesController` bajo el prefijo
  `/api/admin/sippci/capacitaciones` en fase futura. Cambiar el prefijo
  rompe el frontend actual (`capacitaciones.service.ts`).

### Solicitudes (pendientes)
- 🔜 GET /solicitudes/natural
- 🔜 GET /solicitudes/natural/:codigo
- 🔜 GET /solicitudes/juridica
- 🔜 GET /solicitudes/juridica/:codigo
- 🔜 POST /solicitudes/:codigo/aprobar
- 🔜 POST /solicitudes/:codigo/observar
- 🔜 POST /solicitudes/:codigo/rechazar

### Cursos
- GET /cursos ✅ ya existe

### Instructores (FASE 3.2 ✅)
- GET /instructores
- GET /instructores/:id
- POST /instructores
- PUT /instructores/:id
- DELETE /instructores/:id

### Programaciones (FASE 3.3 — en implementación)
- 🔜 GET /programaciones
- 🔜 GET /programaciones/:id
- 🔜 POST /programaciones
- 🔜 PUT /programaciones/:id
- 🔜 PUT /programaciones/:id/reprogramar
- 🔜 PUT /programaciones/:id/cancelar
- 🔜 DELETE /programaciones/:id

### Participantes (existentes, ampliar)
- GET /solicitudes/:codigo/participantes ✅
- POST /solicitudes/:codigo/participantes ✅
- DELETE /participantes/:id ✅
- POST /solicitudes/:codigo/lista-excel ✅
- 🔜 GET /solicitudes/:codigo/lista-excel/descargar ⚠️ nuevo
- GET /solicitudes/:codigo/costo-total ✅

### Aprobación manual (FASE 3.4)
- 🔜 POST /programaciones/:id/participantes/:participanteId/aprobar
- 🔜 POST /programaciones/:id/participantes/:participanteId/reprobar
- 🔜 GET /programaciones/:id/participantes?estado=APROBADO|REPROBADO

### Certificados (FASE 3.5)
- 🔜 POST /programaciones/:id/certificados/emitir
- 🔜 GET /certificados
- 🔜 GET /certificados/:codigo/descargar

### Reportes
- 🔜 GET /reportes/solicitudes-por-estado
- 🔜 GET /reportes/cursos-por-mes
- 🔜 GET /reportes/aprobados-reprobados

### Público
- 🔜 GET /api/public/validar-certificado-capacitacion/:codigo

---

## 8. 🎨 Páginas Frontend

frontend/src/pages/admin/capacitaciones/
├── 🔜 DashboardPage.tsx
├── 🔜 SolicitudesListPage.tsx
├── 🔜 SolicitudDetallePage.tsx
├── 🔜 InstructoresListPage.tsx
├── 🔜 InstructorFormPage.tsx (crear/editar)
├── 🔜 ParticipantesListPage.tsx
├── 🔜 SubirListaPage.tsx
├── 🔜 AprobadosReprobadosPage.tsx
├── 🔜 CursosPage.tsx
├── 🔜 ProgramacionListPage.tsx
├── 🔜 ProgramacionFormPage.tsx (crear)
├── 🔜 ProgramacionDetallePage.tsx
├── 🔜 ReprogramarPage.tsx
├── 🔜 PuntajesPage.tsx
├── 🔜 CertificadosEmitidosPage.tsx
├── 🔜 ReportesPage.tsx
└── 🔜 components/

### Ciudadano/Empresa (logueado)
frontend/src/pages/ciudadano/capacitaciones/
├── 🔜 CatalogoCursosPage.tsx
└── ✅ Formulario YA EXISTE en features/solicitudes/components/FormularioCapacitacion.tsx
       (accesible vía /solicitudes/nueva/capacitacion, FormularioTramitePage.tsx:14)
    🔜 (futuro opcional) Mover a pages/ciudadano/capacitaciones/ para consistencia.

### Público
frontend/src/pages/public/
└── 🔜 ValidarCertificadoCapacitacionPage.tsx

🔜 = planificado, no implementado todavía.

**Nota §8:** el formulario de inscripción de capacitación NO está en
`pages/ciudadano/capacitaciones/`; vive en
`frontend/src/features/solicitudes/components/FormularioCapacitacion.tsx` y se
renderiza desde `pages/ciudadano/FormularioTramitePage.tsx:14` en la ruta
`/solicitudes/nueva/:tipo` (opción `capacitacion` ofrecida por
`NuevaSolicitudPage.tsx:11`). Moverlo a `pages/ciudadano/capacitaciones/` es
opcional y queda como deuda de consistencia.

---

## 9. 🎯 Certificado Capacitación

### Comparativa de los 3 certificados

| Aspecto | Profesionales | Cumplimiento (SIPPCI) | Capacitación |
|---------|---------------|----------------------|--------------|
| Qué certifica | Profesional | Establecimiento | Curso completado |
| Tipo enum | PROFESIONAL | SIPPCI | CAPACITACION |
| Titular | Persona natural | Establecimiento | Participante |
| Código | CERT-YYYY-NNNN | CERT-SIPPCI-YYYY-NNNN | CERT-CAP-YYYY-NNNN |
| PDF service | certificados-pdf.service.ts | Mismo (plantilla) | NUEVO servicio |
| QR endpoint | /validar-certificado/:codigo | Mismo | /validar-certificado-capacitacion/:codigo |
| Tabla BD | certificados | certificados | certificado_capacitacion (NUEVA) |
| Página validación | ValidarCertificadoPage | Misma | ValidarCertificadoCapacitacionPage |
| Vigencia | 2 años | 2 años | 2 años |

El certificado de capacitación es 100% independiente.

---

## 10. 📋 Plan de Implementación

| Sub-fase | Descripción | Estado |
|----------|-------------|--------|
| 3.0 | Cimientos: @Roles + seed 4 cursos + docs | ✅ |
| 3.1 | Migración: instructores + programacion + participante_programacion + certificado_capacitacion | ✅ |
| 3.2 | Backend: CRUD instructores | ✅ |
| 3.3 | Backend: CRUD programaciones | 🔄 |
| 3.4 | Backend: aprobación manual | ⏸️ |
| 3.5 | Backend: certificados PDF + QR propio | ⏸️ |
| 3.6 | Frontend: router + listas | ⏸️ |
| 3.7 | Frontend: programación + participantes | ⏸️ |
| 3.8 | Frontend: certificados + reportes | ⏸️ |
| 3.9 | Frontend: catálogo + formulario | ⏸️ |
| 3.10 | Testing E2E + Docs | ⏸️ |

---

## 11. ⚠️ Reglas de Negocio

1. Vigencia: 2 años desde emisión
2. 4 cursos fijos: EXTINTORES, PRIMEROS_AUXILIOS, EVACUACION, TRABAJOS_EN_ALTURA
3. Instructor: entidad asignada, NO usuario del sistema
4. Programación obligatoria antes de dictar curso
5. Aprobación: manual por el gestor (sin umbral automático)
6. Certificado: solo para participantes marcados APROBADO
7. Justificación: obligatoria para OBSERVAR y RECHAZAR
8. Admin: solo lectura
9. Renovación: pendiente de definir
10. Multi-curso: un participante puede inscribirse a varios cursos
11. Certificado de capacitación es 100% independiente de Profesionales y Cumplimiento

---

## 12. ✅ Reglas de Convivencia con el Equipo

1. Estructura separada:
   - modules/capacitaciones/ → módulo Capacitación
   - pages/admin/capacitaciones/ → páginas Capacitación
2. Sin mezclar consultas: filtro por tipoTramite = CAPACITACION
3. Profesionales y Cumplimiento NO se tocan
4. Sidebar diferenciado por rol (GESTOR_CAPACITACIONES)

---

## 13. 📌 Notas finales

- Formulario público: requiere login externo
- Instructor: entrega lista al gestor por fuera del sistema
- Certificado: tabla propia
- Renovación: pendiente (FASE futura)
- TipoCertificado.CAPACITACION existe en enum pero NO se usa en tabla certificados

---

**FIN DEL DOCUMENTO**
