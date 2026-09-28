# Matriz Cumplimiento — Rol × Acción × Endpoint

**Fecha:** 28/09/2026 (cierre FASE 2)

Roles con acceso (verificado en `cumplimiento.controller.ts`):
ADMIN y GESTOR_CUMPLIMIENTO en los 17 endpoints
(`JwtAuthGuard + RolesGuard`).

| Rol | Acción | Método y endpoint |
|-----|--------|-------------------|
| ADMIN, GESTOR_CUMPLIMIENTO | Listar solicitudes Natural | GET /api/admin/sippci/cumplimiento/solicitudes/natural |
| ADMIN, GESTOR_CUMPLIMIENTO | Ver detalle Natural | GET /api/admin/sippci/cumplimiento/solicitudes/natural/:codigo |
| ADMIN, GESTOR_CUMPLIMIENTO | Listar solicitudes Jurídica | GET /api/admin/sippci/cumplimiento/solicitudes/juridica |
| ADMIN, GESTOR_CUMPLIMIENTO | Ver detalle Jurídica | GET /api/admin/sippci/cumplimiento/solicitudes/juridica/:codigo |
| ADMIN, GESTOR_CUMPLIMIENTO | Aprobar solicitud | POST /api/admin/sippci/cumplimiento/solicitudes/:codigo/aprobar |
| ADMIN, GESTOR_CUMPLIMIENTO | Observar (justificación ≥10) | POST /api/admin/sippci/cumplimiento/solicitudes/:codigo/observar |
| ADMIN, GESTOR_CUMPLIMIENTO | Rechazar (justificación ≥10) | POST /api/admin/sippci/cumplimiento/solicitudes/:codigo/rechazar |
| ADMIN, GESTOR_CUMPLIMIENTO | Programar inspección | POST /api/admin/sippci/cumplimiento/solicitudes/:codigo/programar-inspeccion |
| ADMIN, GESTOR_CUMPLIMIENTO | Listar inspecciones | GET /api/admin/sippci/cumplimiento/inspecciones |
| ADMIN, GESTOR_CUMPLIMIENTO | Ver detalle inspección | GET /api/admin/sippci/cumplimiento/inspecciones/:id |
| ADMIN, GESTOR_CUMPLIMIENTO | Registrar informe (APTO\|OBSERVADO\|NO_APTO) | POST /api/admin/sippci/cumplimiento/inspecciones/:id/registrar-informe |
| ADMIN, GESTOR_CUMPLIMIENTO | Emitir certificado (APROBADA o INFORME_REGISTRADO) | POST /api/admin/sippci/cumplimiento/solicitudes/:codigo/emitir-certificado |
| ADMIN, GESTOR_CUMPLIMIENTO | Certificados emitidos | GET /api/admin/sippci/cumplimiento/certificados |
| ADMIN, GESTOR_CUMPLIMIENTO | Descargar PDF certificado | GET /api/admin/sippci/cumplimiento/certificados/:codigo/descargar |
| ADMIN, GESTOR_CUMPLIMIENTO | Reporte por estado | GET /api/admin/sippci/cumplimiento/reportes/solicitudes-por-estado |
| ADMIN, GESTOR_CUMPLIMIENTO | Reporte por nivel de riesgo | GET /api/admin/sippci/cumplimiento/reportes/por-nivel-riesgo |
| ADMIN, GESTOR_CUMPLIMIENTO | Reporte por mes | GET /api/admin/sippci/cumplimiento/reportes/certificados-por-mes |

## Exclusiones

GESTOR_REGISTRO_PROFESIONAL, GESTOR_CAPACITACIONES y CAJERO → 403 en todo el módulo.
Ver E2E test 1 (`cumplimiento.spec.ts`): el sidebar no muestra Profesionales.
