# Módulo Profesionales — SIPPCI V2.0

Documentación completa del módulo de Registro Profesional
(personas naturales y jurídicas) implementado en FASE 1.

## Estado

✅ COMPLETO end-to-end (backend + frontend + PDF + QR + validación pública)

## Alcance

Gestión completa de solicitudes de certificación profesional:
- Persona Natural (formulario propio)
- Persona Jurídica (formulario propio)

## Roles con acceso

| Rol | Acceso |
|-----|--------|
| ADMIN | Todo |
| GESTOR_REGISTRO_PROFESIONAL | Solo Profesionales |
| GESTOR_CUMPLIMIENTO | ❌ |
| GESTOR_CAPACITACIONES | ❌ |
| CAJERO | ❌ |

## Estructura Backend

```
backend/src/modules/
├── profesionales/
│   ├── profesionales.module.ts
│   ├── profesionales.controller.ts  (15 endpoints)
│   ├── profesionales.service.ts     (lógica + PDF integration)
│   └── dto/
│       ├── query-profesionales.dto.ts
│       └── emitir-certificado.dto.ts
├── certificados/
│   └── certificados-pdf.service.ts  (generación PDF + QR)
└── public/
    ├── certificados-public.controller.ts  (validación pública)
    └── certificados-public.service.ts
```

## Estructura Frontend

```
frontend/src/
├── pages/admin/profesionales/
│   ├── SolicitudesListPage.tsx           (lista genérica NATURAL/JURIDICA)
│   ├── SolicitudDetallePage.tsx          (Expediente Digital dinámico)
│   ├── ListaProfesionalesPage.tsx        (certificados vigentes)
│   ├── CertificadosEmitidosPage.tsx      (todos los PDFs)
│   ├── ReportesPage.tsx                  (3 gráficos con recharts)
│   └── components/
│       └── ModalJustificacion.tsx        (observar/rechazar)
├── pages/public/
│   └── ValidarCertificadoPage.tsx        (validación pública QR)
├── services/
│   └── profesionales.service.ts          (14 métodos admin + legacy)
└── types/
    └── profesional.types.ts
```

## Flujo completo

1. Ciudadano llena formulario Natural/Jurídica y adjunta docs
2. Envía solicitud → pasa DIRECTO a EN_REVISION (sin parada en ENVIADA;
   `SolicitudesService.enviar()` salta BORRADOR → EN_REVISION)
3. Gestor ve la solicitud en su bandeja
4. Entra al Expediente Digital (SolicitudDetallePage)
5. Revisa documentos
6. Decide:
   - ✅ APROBAR → estado APROBADA
   - ⚠️ OBSERVAR (con justificación ≥10 chars) → estado OBSERVADA
   - ❌ RECHAZAR (con justificación ≥10 chars) → estado RECHAZADA
7. Si APROBADA → botón "Emitir Certificado"
8. Se genera PDF + QR, estado CERTIFICADO_EMITIDO
9. Certificado aparece en "Lista de Profesionales"
10. Ciudadano escanea QR → página pública de validación

## Certificados

- **Tipo:** PROFESIONAL (enum TipoCertificado)
- **Vigencia:** 2 años desde emisión
- **Formato:** PDF A4 landscape con QR
- **Código:** CERT-YYYY-NNNN (auto-incremental)
- **QR apunta a:** {FRONTEND_URL}/validar-certificado/{codigo}

## Estados de Solicitud

```
BORRADOR → EN_REVISION → REVISADO → APROBADA → CERTIFICADO_EMITIDO
                    ↘ OBSERVADA (vuelve a ENVIADA, reenvío manual)
                    ↘ RECHAZADA (final)
```
> **Nota:** ENVIADA solo se alcanza por reenvío tras OBSERVADA
> (`OBSERVADA → ENVIADA` vía `PATCH :codigo/estado`) o en filas históricas.
> El envío inicial del ciudadano ya no pisa ENVIADA.

## Pendientes

- ✅ Testing E2E (ver `docs/TESTING_PROFESIONALES.md` — 7/7 pasando)
- Persistir rutaArchivo en certificados (requiere migración)
- Notificaciones por email al aprobar/observar/rechazar
- Exportación de reportes a Excel/PDF
