# Matriz Profesionales — Rol × Acción × Endpoint

**Fecha:** 28/09/2026 (cierre FASE 2)

Roles con acceso (verificado en `profesionales.controller.ts`):
ADMIN y GESTOR_REGISTRO_PROFESIONAL en los 15 endpoints
(`JwtAuthGuard + RolesGuard`). Más 1 endpoint público de validación.

| Rol | Acción | Método y endpoint |
|-----|--------|-------------------|
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Listar solicitudes Natural | GET /api/admin/profesionales/solicitudes/natural |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Ver detalle Natural | GET /api/admin/profesionales/solicitudes/natural/:codigo |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Listar solicitudes Jurídica | GET /api/admin/profesionales/solicitudes/juridica |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Ver detalle Jurídica | GET /api/admin/profesionales/solicitudes/juridica/:codigo |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Aprobar solicitud | POST /api/admin/profesionales/solicitudes/:codigo/aprobar |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Observar (justificación ≥10) | POST /api/admin/profesionales/solicitudes/:codigo/observar |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Rechazar (justificación ≥10) | POST /api/admin/profesionales/solicitudes/:codigo/rechazar |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Emitir certificado (solo APROBADA) | POST /api/admin/profesionales/solicitudes/:codigo/emitir-certificado |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Lista profesionales naturales | GET /api/admin/profesionales/lista/naturales |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Lista profesionales jurídicos | GET /api/admin/profesionales/lista/juridicas |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Certificados emitidos | GET /api/admin/profesionales/certificados |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Reporte por estado | GET /api/admin/profesionales/reportes/solicitudes-por-estado |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Reporte por mes | GET /api/admin/profesionales/reportes/certificados-por-mes |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Reporte por especialidad | GET /api/admin/profesionales/reportes/por-especialidad |
| ADMIN, GESTOR_REGISTRO_PROFESIONAL | Descargar PDF certificado | GET /api/admin/profesionales/certificados/:codigo/descargar |
| PÚBLICO (sin auth) | Validar certificado por QR | GET /api/public/validar-certificado/:codigo |

## Exclusiones

GESTOR_CUMPLIMIENTO, GESTOR_CAPACITACIONES y CAJERO → 403 en todo el módulo.
Ver E2E test 1 (`profesionales.spec.ts`): el sidebar no muestra Cumplimiento ni Pagos.
