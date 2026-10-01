-- Eliminar valor EN_INSPECCION del enum EstadoSolicitud
-- Requiere recrear el tipo enum en PostgreSQL
-- También afecta a historial_solicitudes (estadoAnterior, estadoNuevo)

ALTER TABLE "solicitudes" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "historial_solicitudes" ALTER COLUMN "estadoAnterior" DROP DEFAULT;
ALTER TABLE "historial_solicitudes" ALTER COLUMN "estadoNuevo" DROP DEFAULT;

ALTER TYPE "EstadoSolicitud" RENAME TO "EstadoSolicitud_old";

CREATE TYPE "EstadoSolicitud" AS ENUM (
  'BORRADOR', 'ENVIADA', 'EN_REVISION', 'REVISADO', 'OBSERVADA',
  'INSPECCION_PROGRAMADA', 'INFORME_REGISTRADO', 'APROBADA',
  'RECHAZADA', 'CERTIFICADO_EMITIDO', 'VENCIDO', 'RENOVADO', 'ANULADA'
);

ALTER TABLE "solicitudes"
  ALTER COLUMN "estado" TYPE "EstadoSolicitud"
  USING "estado"::text::"EstadoSolicitud";

ALTER TABLE "historial_solicitudes"
  ALTER COLUMN "estadoAnterior" TYPE "EstadoSolicitud"
  USING "estadoAnterior"::text::"EstadoSolicitud";

ALTER TABLE "historial_solicitudes"
  ALTER COLUMN "estadoNuevo" TYPE "EstadoSolicitud"
  USING "estadoNuevo"::text::"EstadoSolicitud";

ALTER TABLE "solicitudes" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';

DROP TYPE "EstadoSolicitud_old";