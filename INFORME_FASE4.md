# INFORME DE AVANCE - FASE 4 - 22/09/2026 22:30

## 4.1 MisSolicitudesPage — COMPLETADO
- `MisSolicitudesPage.tsx` reescrito con TanStack Query (`useQuery(['solicitudes','mias'])`) y TanStack Table (`@tanstack/react-table` v8 con columnas: código, tipo, estado, fechas, acciones).
- Filtros: búsqueda por texto (código/tipo), selector de estado y selector de tipo. Paginación client-side (PAGE_SIZE=8) sobre el array plano de `/solicitudes/mias`.
- Acciones por fila: "Ver detalle" (navega a `/solicitudes/:codigo`) y "Descargar comprobante" (busca doc `BOLETA_DEPOSITO` o `COMPROBANTE_PAGO` en `sol.documentos` y descarga vía `descargarBlob`).
- Estados de carga (Spinner), error y vacío ("Aun no tienes solicitudes"). Botón "Nueva Solicitud" -> `/solicitudes/nueva`.
- SCSS nuevo en `MisSolicitudesPage.module.scss`.
- Build: exit 0.

## 4.2 SolicitudDetallePage — COMPLETADO
- `SolicitudDetallePage.tsx` reescrito con `useQuery(['solicitud', codigo])` (backed `findOne`) y mutation `enviar` para estado BORRADOR (invalida la query).
- Secciones: Datos de la solicitud (tipo/subtipo/fechas/titular/CI-NIT/email/teléfono), Documentos (tabla con tipo, archivo, estado, subida y botón Descargar), Pagos (número de operación, monto, banco, fecha, estado), Declaración jurada (código, aceptada, firmada, contenido), Certificado (código/emisiones), e Historial (timeline estilo `estadoAnterior -> estadoNuevo` + comentario).
- Botones: Volver, Enviar (solo BORRADOR), Renovar (solo CERTIFICADO_EMITIDO/VENCIDO — la renovación se habilitará en fase posterior: toast informativo).
- Se corrigió `declaracionesJuradas` en `solicitud.types.ts`: la relación es **uno a uno** (objeto, no array) => `DeclaracionJurada | null`.
- SCSS ampliado (acciones, datos, table, decla, empty, timeline/*).
- Build: exit 0.

## 4.3 NotificacionesPage — COMPLETADO
- `NotificacionesPage.tsx` reescrito con TanStack Query (`useQuery(['notificaciones'])`, `notificacionesService.findAll`).
- Filtros por tabs propias (Todas / No leídas / Leídas); cada notificación muestra asunto, mensaje, fecha y badge leída/nueva; contador "N sin leer".
- Acciones: "Marcar como leída" por ítem y "Marcar todas como leídas" (mutations con invalidación de cache). Estados carga/error/vacío.
- SCSS nuevos (head, tabs, item/unread, top/bottom).
- Build: exit 0.

## 4.4 Endpoint de descarga — COMPLETADO
- `documentos.controller.ts`: `GET /documentos/:id/descargar` ahora devuelve `StreamableFile` con `createReadStream` + `Content-Disposition` (filename codificado) y `Content-Type`.
- Prueba real en FASE dev: se subió `f4comprobante.pdf` (38 bytes) y se descargó; conteo íntegro con contenido idéntico (`CONTIENE_ORIGINAL=True`).

## 4.5 Pruebas del panel — COMPLETADO
- Usuarios de prueba `+f4dl` y `+f4u` (@gmail.com) con OTP dev.
- Solicitudes creadas y verificadas vía `/solicitudes/mias` (3: 1 BORRADOR, 2 ENVIADA con documentos y pagos, incluidas relaciones traídas: `documentos.Count` y `pagos.Count`).
- `findOne` trae historial (`BORRADOR -> ENVIADA`), declaraciones juradas (DJ-2026-00001/02), documentos y pagos.
- Notificaciones: insertadas 2 (1 leída, 1 no leída), marcar leída OK, filtro `?leida=false` OK, `leer-todas` OK.
- Descarga de comprobante OK (ver 4.4).
- Datos de prueba eliminados de BD y `backend/uploads/` vacío. Backend reiniciado en modo normal (PID 19684, sin OTP dev).

## Validación FASE 4
- `npm run lint` (frontend): exit 0
- `npx tsc --noEmit` (frontend): exit 0
- `npm run build` (frontend): exit 0
- Backend responsive (401 sin token en `/mias`).

## Próxima acción
Añadir el usuario `ciudadano.demostracion@gmail.com` y dar de alta los 3 trámites de ejemplo que queden visibles en el panel para la revisión.

## Bloqueos
Ninguno.