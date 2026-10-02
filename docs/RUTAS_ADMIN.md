# Rutas del Dashboard Admin — SIPPCI V2.0

Documento de referencia para el equipo. Define TODAS las rutas
únicas del panel admin, agrupadas por módulo.

## Módulo SIPPCI → Profesionales

| Ruta | Vista | Rol con acceso |
|------|-------|----------------|
| `/admin/profesionales/solicitudes/natural` | Bandeja Persona Natural | ADMIN, GESTOR_REGISTRO_PROFESIONAL |
| `/admin/profesionales/solicitudes/natural/:codigo` | Expediente Digital Natural | ADMIN, GESTOR_REGISTRO_PROFESIONAL |
| `/admin/profesionales/solicitudes/juridica` | Bandeja Persona Jurídica | ADMIN, GESTOR_REGISTRO_PROFESIONAL |
| `/admin/profesionales/solicitudes/juridica/:codigo` | Expediente Digital Jurídica | ADMIN, GESTOR_REGISTRO_PROFESIONAL |
| `/admin/profesionales/lista/naturales` | Lista profesionales naturales | ADMIN, GESTOR_REGISTRO_PROFESIONAL |
| `/admin/profesionales/lista/juridicas` | Lista profesionales jurídicas | ADMIN, GESTOR_REGISTRO_PROFESIONAL |
| `/admin/profesionales/certificados` | Certificados emitidos | ADMIN, GESTOR_REGISTRO_PROFESIONAL |
| `/admin/profesionales/reportes` | Reportes | ADMIN, GESTOR_REGISTRO_PROFESIONAL |

## Módulo SIPPCI → Cumplimiento (futuro)

| Ruta | Vista |
|------|-------|
| `/admin/sippci/cumplimiento/solicitudes` | Bandeja |
| `/admin/sippci/cumplimiento/solicitudes/:codigo` | Expediente Digital |
| `/admin/sippci/cumplimiento/certificados` | Certificados |
| `/admin/sippci/cumplimiento/reportes` | Reportes |

## Módulo SIPPCI → Capacitaciones

| Ruta | Vista | Rol | Estado |
|------|-------|-----|--------|
| `/admin/sippci/capacitaciones/programaciones` | Programaciones | ADMIN, GESTOR_CAPACITACIONES | ✅ Implementada |
| `/admin/sippci/capacitaciones/programaciones/:id` | Detalle de programación | ADMIN, GESTOR_CAPACITACIONES | ✅ Implementada |
| `/admin/sippci/capacitaciones/instructores` | Instructores | ADMIN, GESTOR_CAPACITACIONES | ✅ Implementada |
| `/admin/sippci/capacitaciones/cursos` | Cursos | ADMIN, GESTOR_CAPACITACIONES | ✅ Implementada (catálogo fijo, solo lectura) |
| `/admin/sippci/capacitaciones/listas` | Listas | ADMIN, GESTOR_CAPACITACIONES | ✅ Stub "en desarrollo" |
| `/admin/sippci/capacitaciones/puntajes` | Puntajes | ADMIN, GESTOR_CAPACITACIONES | ✅ Stub "próximamente" |
| `/admin/sippci/capacitaciones/certificados` | Certificados | ADMIN, GESTOR_CAPACITACIONES | ✅ Implementada (listado + descarga PDF) |

> **Ruta pública de validación:** `/validar-certificado-capacitacion/:codigo`
> (sin login, dentro de `PublicLayout`). La emisión individual y en lote vive
> como **acción dentro del detalle de la programación**, no como ruta propia.

> **Nota:** alta/edición de instructores y de programaciones se resuelven con
> **modales** dentro de sus listados (no hay rutas `/crear` ni `/:id/editar`).
> En el menú de `ADMIN` los enlaces son **planos** porque `AdminSidebar` todavía
> no renderiza submenús anidados (bug preexistente).

## Módulo Reglamentación (futuro)

| Ruta | Vista |
|------|-------|
| `/admin/reglamentacion/armeria/solicitudes` | Armería - Solicitudes |
| `/admin/reglamentacion/armeria/solicitudes/:codigo` | Armería - Detalle |
| `/admin/reglamentacion/armeria/certificados` | Armería - Certificados |
| `/admin/reglamentacion/campos/solicitudes` | Campos de Tiro - Solicitudes |
| `/admin/reglamentacion/campos/solicitudes/:codigo` | Campos - Detalle |
| `/admin/reglamentacion/campos/certificados` | Campos - Certificados |
| `/admin/reglamentacion/poligonos/solicitudes` | Polígonos - Solicitudes |
| `/admin/reglamentacion/poligonos/solicitudes/:codigo` | Polígonos - Detalle |
| `/admin/reglamentacion/poligonos/certificados` | Polígonos - Certificados |

**NOTA:** Hidrocarburos ELIMINADO (módulo no aprobado).

## Módulo Turismo (futuro)

| Ruta | Vista |
|------|-------|
| `/admin/turismo/aereas/solicitudes` | Aéreas - Solicitudes |
| `/admin/turismo/aereas/solicitudes/:codigo` | Aéreas - Detalle |
| `/admin/turismo/aereas/certificados` | Aéreas - Certificados |
| `/admin/turismo/acuaticas/solicitudes` | Acuáticas - Solicitudes |
| `/admin/turismo/acuaticas/solicitudes/:codigo` | Acuáticas - Detalle |
| `/admin/turismo/acuaticas/certificados` | Acuáticas - Certificados |
| `/admin/turismo/terrestres/solicitudes` | Terrestres - Solicitudes |
| `/admin/turismo/terrestres/solicitudes/:codigo` | Terrestres - Detalle |
| `/admin/turismo/terrestres/certificados` | Terrestres - Certificados |

## Módulo Pagos

| Ruta | Vista | Rol |
|------|-------|-----|
| `/admin/pagos` | Todos los pagos | ADMIN, CAJERO |
| `/admin/pagos/pendientes` | Pendientes | ADMIN, CAJERO |
| `/admin/pagos/verificados` | Verificados | ADMIN, CAJERO |
| `/admin/pagos/observados` | Observados | ADMIN, CAJERO |

## Otros

| Ruta | Vista | Rol |
|------|-------|-----|
| `/admin/dashboard` | Dashboard principal | Todos |
| `/admin/usuarios` | Usuarios | ADMIN |
| `/admin/auditoria` | Auditoría | ADMIN |
| `/admin/configuracion` | Configuración | ADMIN |
| `/admin/notificaciones` | Notificaciones | Todos |

## Reglas

1. Cada submódulo tiene su propia ruta base única.
2. Los paths NO se repiten entre submódulos.
3. Los roles se filtran en el sidebar mediante `MENU_POR_ROL`.
4. Los roles se validan en el backend mediante `RolesGuard` + `@Roles()`.