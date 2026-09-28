# API Cumplimiento — Endpoints

**Fecha:** 28/09/2026 (cierre FASE 2)

Base URL: `http://localhost:3001/api`
Base del módulo: `/admin/sippci/cumplimiento` (17 endpoints)

Todos los endpoints requieren:
- Header `Authorization: Bearer {JWT}` (interno)
- Roles: ADMIN o GESTOR_CUMPLIMIENTO (`JwtAuthGuard + RolesGuard`, verificado en
  `cumplimiento.controller.ts` — las 17 rutas usan `@Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')`)

Fuente verificada: `backend/src/modules/cumplimiento/cumplimiento.controller.ts`,
`cumplimiento.service.ts`, `dto/*.ts`.

## Solicitudes Natural

### GET /admin/sippci/cumplimiento/solicitudes/natural
Lista paginada (`tipoTramite=CERTIFICACION_SIPPCI`, `subtipoTramite=NATURAL`).

**Query params (`QueryCumplimientoDto`):**
- `search` (opcional): código, nombre de usuario o razón social
- `estado` (opcional): BORRADOR|ENVIADA|EN_REVISION|OBSERVADA|INSPECCION_PROGRAMADA|EN_INSPECCION|INFORME_REGISTRADO|APROBADA|RECHAZADA|CERTIFICADO_EMITIDO|VENCIDO|RENOVADO|ANULADA
- `nivelRiesgo` (opcional): BAJO|MEDIO|ALTO — ⚠️ aceptado pero **no filtra**
  (el `where` del servicio solo usa estado/search/fechas; verificado en código)
- `fechaDesde`, `fechaHasta` (opcional): ISO date
- `page` (default 1), `limit` (default 20)

**Response:**
```json
{
  "items": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "pages": 3
}
```
Cada item incluye usuario, empresa, documentos, certificados e inspecciones (resumen).

### GET /admin/sippci/cumplimiento/solicitudes/natural/:codigo
Detalle completo (Expediente Digital): usuario, empresa, documentos, pagos,
certificados, inspecciones (con inspector) e historial. 404 si no existe.

## Solicitudes Jurídica

### GET /admin/sippci/cumplimiento/solicitudes/juridica
### GET /admin/sippci/cumplimiento/solicitudes/juridica/:codigo
(Mismo formato que Natural, `subtipoTramite=JURIDICA`.)

## Acciones

Transiciones validadas contra `SolicitudStateMachine`; transición inválida → **403**
`Transición no permitida: X → Y`. Solicitud inexistente o de otro trámite → **404**.

### POST /admin/sippci/cumplimiento/solicitudes/:codigo/aprobar
Body: (vacío). Requiere estado que permita → APROBADA (según mapa: REVISADO).
Setea `fechaAprobacion` y registra historial.

### POST /admin/sippci/cumplimiento/solicitudes/:codigo/observar
Body:
```json
{ "justificacion": "Falta declaración jurada firmada" }
```
Validación: justificación ≥10 caracteres (400 si no cumple).

### POST /admin/sippci/cumplimiento/solicitudes/:codigo/rechazar
Body:
```json
{ "justificacion": "Documentación fraudulenta" }
```
Validación: justificación ≥10 caracteres (400 si no cumple).

## Inspecciones

### POST /admin/sippci/cumplimiento/solicitudes/:codigo/programar-inspeccion
Body (`ProgramarInspeccionDto`):
```json
{
  "fechaProgramada": "2026-10-05T10:00:00Z",
  "inspectorId": 3,
  "observaciones": "Llevar checklist ALTO riesgo"
}
```
- `fechaProgramada` ISO obligatoria; `inspectorId` opcional (default: usuario actual);
  `observaciones` opcional.
- Crea `inspecciones` (estado PROGRAMADA) + pasa la solicitud a
  INSPECCION_PROGRAMADA en transacción. Transición inválida → 403.
- Response: la inspección creada.

### GET /admin/sippci/cumplimiento/inspecciones
Lista paginada de inspecciones del trámite SIPPCI (mismos query params).

### GET /admin/sippci/cumplimiento/inspecciones/:id
Detalle de inspección. 404 si no existe.

### POST /admin/sippci/cumplimiento/inspecciones/:id/registrar-informe
Body (`RegistrarInformeDto`):
```json
{
  "resultado": "APTO",
  "observaciones": "Cumple norma NB-…",
  "informeRuta": "uploads/informes/INF-001.pdf"
}
```
- `resultado`: APTO | OBSERVADO | NO_APTO (obligatorio).
- `observaciones` obligatoria; `informeRuta` opcional.
- Efecto: APTO → inspección CONFORME + solicitud INFORME_REGISTRADO;
  OBSERVADO → inspección EN_CURSO + solicitud OBSERVADA;
  NO_APTO → inspección NO_CONFORME + solicitud OBSERVADA.
- ⚠️ No valida transición de estado previa (verificado en código).

## Certificados

### POST /admin/sippci/cumplimiento/solicitudes/:codigo/emitir-certificado
Body:
```json
{ "observaciones": "Emisión normal" }
```
- Requiere estado APROBADA o INFORME_REGISTRADO (400 en otro caso).
- Rechaza si ya existe un certificado activo (400).
- Response: certificado + `rutaArchivo` (`uploads/certificados/CERT-SIPPCI-*.pdf`)
  + `qrBase64`. Código `CERT-SIPPCI-YYYY-NNNN`, tipo SIPPCI, vigencia 2 años.

### GET /admin/sippci/cumplimiento/certificados
Certificados activos (paginado con los mismos query params).

### GET /admin/sippci/cumplimiento/certificados/:codigo/descargar
Descarga el PDF. Response: `Content-Type: application/pdf` (vía `res.sendFile`).

## Reportes

### GET /admin/sippci/cumplimiento/reportes/solicitudes-por-estado
Response: `[{ "estado": "APROBADA", "total": 12 }, ...]`

### GET /admin/sippci/cumplimiento/reportes/por-nivel-riesgo
Response: `[{ "nivelRiesgo": "ALTO", "total": 8 }, ...]`
([PENDIENTE VERIFICAR] origen exacto del campo nivelRiesgo en `datosJson`.)

### GET /admin/sippci/cumplimiento/reportes/certificados-por-mes
Response: `[{ "mes": "2026-09", "total": 5 }, ...]`
