# Módulo Cumplimiento SIPPCI — V2.0

**Fecha:** 28/09/2026 (cierre FASE 2)

Documentación del módulo de Certificación SIPPCI de cumplimiento
(personas naturales y jurídicas con inspección técnica en sitio),
implementado en FASE 2. Formato espejo de `MODULO_PROFESIONALES.md`.

Fuente verificada en código: `backend/src/modules/cumplimiento/`
(controller 17 endpoints, service, 4 DTOs) y
`backend/src/modules/solicitudes/state-machine/solicitud.state-machine.ts`.

## Estado

✅ COMPLETO end-to-end (backend + frontend + PDF + inspección + reportes).
E2E 8/8 pasando (ver `docs/TESTING_CUMPLIMIENTO.md`).

## Alcance

Gestión completa de solicitudes de certificación SIPPCI (`TipoTramite = CERTIFICACION_SIPPCI`):
- Persona Natural (bandeja propia)
- Persona Jurídica (bandeja propia)
- Inspección técnica programada + informe con resultado APTO / OBSERVADO / NO_APTO
- Certificado tipo SIPPCI con vigencia de 2 años

## Roles con acceso

| Rol | Acceso |
|-----|--------|
| ADMIN | Todo |
| GESTOR_CUMPLIMIENTO | Solo Cumplimiento (los 17 endpoints) |
| GESTOR_REGISTRO_PROFESIONAL | ❌ |
| GESTOR_CAPACITACIONES | ❌ |
| CAJERO | ❌ |

Verificado: todos los endpoints usan `@Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')`
con `JwtAuthGuard + RolesGuard`.

## Estructura Backend

```
backend/src/modules/
├── cumplimiento/
│   ├── cumplimiento.module.ts
│   ├── cumplimiento.controller.ts  (17 endpoints, base /api/admin/sippci/cumplimiento)
│   ├── cumplimiento.service.ts     (lógica + transacciones Prisma + PDF)
│   └── dto/
│       ├── query-cumplimiento.dto.ts      (search, estado 13 valores, nivelRiesgo, fechas, page/limit)
│       ├── accion-cumplimiento.dto.ts     (Observar/Rechazar: justificacion ≥10; Emitir: observaciones?)
│       ├── programar-inspeccion.dto.ts    (fechaProgramada ISO, inspectorId?, observaciones?)
│       └── registrar-informe.dto.ts       (resultado APTO|OBSERVADO|NO_APTO, observaciones, informeRuta?)
├── certificados/
│   └── certificados-pdf.service.ts  (generación PDF + QR, compartido con Profesionales)
└── solicitudes/
    └── state-machine/solicitud.state-machine.ts  (transiciones, incluye rama inspección)
```

## Estructura Frontend

```
frontend/src/
├── pages/admin/cumplimiento/
│   ├── SolicitudesListPage.tsx           (listas NATURAL / JURIDICA por prop `tipo`)
│   ├── SolicitudDetallePage.tsx          (Expediente Digital)
│   ├── InspeccionesListPage.tsx          (Inspecciones Técnicas)
│   ├── InspeccionDetallePage.tsx         (detalle + registrar informe)
│   ├── CertificadosCumplimientoPage.tsx  (Certificados Emitidos)
│   ├── ReportesCumplimientoPage.tsx      (3 gráficos)
│   └── components/
│       ├── ModalJustificacion.tsx        (observar/rechazar)
│       └── ModalProgramarInspeccion.tsx  (programar inspección)
├── services/
│   └── cumplimiento.service.ts
└── types/
    └── cumplimiento.types.ts
```

Rutas (ver `src/router/index.tsx`): `/admin/sippci/cumplimiento/solicitudes/natural[/:codigo]`,
`.../solicitudes/juridica[/:codigo]`, `.../inspecciones[/:id]`, `.../certificados`, `.../reportes`.

## Flujo completo

1. Ciudadano llena formulario SIPPCI Natural/Jurídica y adjunta docs
2. Envía solicitud (estado: ENVIADA → EN_REVISION)
3. Gestor ve la solicitud en su bandeja (Natural o Jurídica)
4. Entra al Expediente Digital y revisa documentos
5. Decide:
   - ✅ APROBAR → estado APROBADA (emite certificado directo)
   - 🧭 PROGRAMAR INSPECCIÓN → estado INSPECCION_PROGRAMADA (crea fila en `inspecciones` con estado PROGRAMADA)
   - ⚠️ OBSERVAR (justificación ≥10 chars) → estado OBSERVADA
   - ❌ RECHAZAR (justificación ≥10 chars) → estado RECHAZADA
6. Tras la visita, registra el informe (`resultado`):
   - APTO → inspección CONFORME, solicitud INFORME_REGISTRADO
   - OBSERVADO → inspección EN_CURSO, solicitud OBSERVADA
   - NO_APTO → inspección NO_CONFORME, solicitud OBSERVADA
7. Con INFORME_REGISTRADO, el gestor revisa el informe y decide:
   - ✅ APROBAR INFORME → estado APROBADA
   - ⚠️ OBSERVAR INFORME (justificación ≥10 chars) → estado OBSERVADA
   - ❌ RECHAZAR INFORME (justificación ≥10 chars) → estado RECHAZADA
8. Con APROBADA → "Emitir Certificado"
9. Se genera `CERT-SIPPCI-YYYY-NNNN` (auto-incremental por año), PDF + QR,
   estado CERTIFICADO_EMITIDO. Si ya existe un certificado activo, se rechaza (400).

> **Cambio importante (Fix A3):** La emisión de certificado desde `INFORME_REGISTRADO` **ya no es válida**.
> Ahora el flujo exige: `INFORME_REGISTRADO → APROBADA → CERTIFICADO_EMITIDO`.
> Se añadieron 3 botones específicos para `INFORME_REGISTRADO`: "Aprobar informe", "Observar informe", "Rechazar informe".

## Certificados

- **Tipo:** SIPPCI (`TIPO_CERTIFICADO = 'SIPPCI'`)
- **Vigencia:** 2 años desde emisión (`VIGENCIA_ANIOS = 2`)
- **Formato:** PDF en `uploads/certificados/CERT-SIPPCI-*.pdf` + `qrBase64`
- **Código:** `CERT-SIPPCI-YYYY-NNNN` (auto-incremental por año)
- **Validación pública:** ruta `/validar-certificado/:codigo`
  ([PENDIENTE VERIFICAR] destino exacto codificado en el QR: el servicio PDF es
  compartido con Profesionales — confirmar que apunta al validador SIPPCI).

## Estados de Solicitud (rama inspección)

```
BORRADOR → ENVIADA → EN_REVISION → REVISADO → APROBADA → CERTIFICADO_EMITIDO
                        │    ├→ OBSERVADA (vuelve a ENVIADA)
                        │    └→ RECHAZADA (final)
                        └→ INSPECCION_PROGRAMADA → INFORME_REGISTRADO → APROBADA → CERTIFICADO_EMITIDO
                                                 ├→ OBSERVADA (vuelve a ENVIADA)
                                                 └→ RECHAZADA (final)
```

 Definido en `solicitud.state-machine.ts`:
 `EN_REVISION → INSPECCION_PROGRAMADA`,
 `INSPECCION_PROGRAMADA → INFORME_REGISTRADO | RECHAZADA`,
 `INFORME_REGISTRADO → REVISADO | APROBADA | OBSERVADA | RECHAZADA`.

> ✅ **Fix B2 (28/09/2026):** Estado `EN_INSPECCION` eliminado del enum y del mapa de transiciones.
> El flujo de inspección ahora salta directo de `INSPECCION_PROGRAMADA` a `INFORME_REGISTRADO`
> (o `RECHAZADA`) tras registrar el informe. El estado `EN_INSPECCION` era un paso intermedio
> que nunca se usaba en la práctica (ningún endpoint lo asignaba).

## Nivel de riesgo

Filtro propio del módulo (`nivelRiesgo`: BAJO | MEDIO | ALTO) en listados
y reporte `por-nivel-riesgo`. Dato origen: `solicitudes.datosJson`
([PENDIENTE VERIFICAR] campo exacto y si hay validación al crear la solicitud).

## Pendientes del módulo

- Confirmar destino del QR en certificados SIPPCI.
- Notificaciones por email al aprobar/observar/rechazar/emitir.
- Exportación de reportes a Excel/PDF.

## Cambios recientes

### Fix A3 (28/09/2026)
- Añadida transición `INFORME_REGISTRADO → APROBADA` en state-machine.
- `emitirCertificado` ahora usa `validarTransicion` (solo permite `APROBADA → CERTIFICADO_EMITIDO`).
- Frontend: 3 botones nuevos para `INFORME_REGISTRADO`: "Aprobar informe", "Observar informe", "Rechazar informe".
- Flujo post-informe: `INFORME_REGISTRADO → (aprobar|observar|rechazar) → APROBADA|OBSERVADA|RECHAZADA`.
- Emitir certificado **solo desde APROBADA** (ya no desde INFORME_REGISTRADO).

### Fix B2 (28/09/2026)
- Eliminado estado `EN_INSPECCION` del enum `EstadoSolicitud` (migración BD + 13 estados restantes).
- State-machine: `INSPECCION_PROGRAMADA → INFORME_REGISTRADO` directo (sin paso intermedio).
- Service: `registrarInforme` solo acepta `INSPECCION_PROGRAMADA`.
- DTO: `query-cumplimiento.dto.ts` sin `EN_INSPECCION` en filtro `estado`.
- Frontend: filtro, badge y color de gráfico eliminados.
- BD: 13 estados en `EstadoSolicitud` (era 14).
