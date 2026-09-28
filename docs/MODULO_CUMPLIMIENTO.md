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
7. Con APROBADA o INFORME_REGISTRADO → "Emitir Certificado"
8. Se genera `CERT-SIPPCI-YYYY-NNNN` (auto-incremental por año), PDF + QR,
   estado CERTIFICADO_EMITIDO. Si ya existe un certificado activo, se rechaza (400).

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
                        └→ INSPECCION_PROGRAMADA → INFORME_REGISTRADO → REVISADO / OBSERVADA / RECHAZADA
                                                 └→ RECHAZADA (directo)
```

 Definido en `solicitud.state-machine.ts`:
 `EN_REVISION → INSPECCION_PROGRAMADA`,
 `INSPECCION_PROGRAMADA → EN_INSPECCION | RECHAZADA`,
 `EN_INSPECCION → INFORME_REGISTRADO`,
 `INFORME_REGISTRADO → REVISADO | OBSERVADA | RECHAZADA`.

> ⚠️ Observación verificada en código: el servicio **nunca asigna `EN_INSPECCION`**
> a la solicitud — `programarInspeccion` pone `INSPECCION_PROGRAMADA` y
> `registrarInforme` salta directo a `INFORME_REGISTRADO`/`OBSERVADA` sin
> `validarTransicion`. La state-machine sí contempla el paso intermedio.
> Decidir si se usa (p. ej. al iniciar la visita) o se elimina del mapa.

## Nivel de riesgo

Filtro propio del módulo (`nivelRiesgo`: BAJO | MEDIO | ALTO) en listados
y reporte `por-nivel-riesgo`. Dato origen: `solicitudes.datosJson`
([PENDIENTE VERIFICAR] campo exacto y si hay validación al crear la solicitud).

## Pendientes del módulo

- Definir uso de `EN_INSPECCION` (ver observación arriba).
- Confirmar destino del QR en certificados SIPPCI.
- Notificaciones por email al aprobar/observar/rechazar/emitir.
- Exportación de reportes a Excel/PDF.
