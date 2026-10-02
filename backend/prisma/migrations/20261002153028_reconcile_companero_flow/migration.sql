-- Reconciliación del flujo del compañero (e0acfca) con el modelo propio (rodri).
-- NO se aplican sus migraciones tal cual (fallarían): esta migración manual
-- añade solo lo compatible:
--   * nuevos valores de enum (ADD VALUE, sin tocar los existentes)
--   * columnas nuevas, todas anulables salvo esRepresentante (tiene DEFAULT)
--   * backfill nombre->nombreCompleto y ci->carnet en las 6 filas existentes
--   * índices únicos parciales (permiten múltiples NULL)

-- Nuevos valores del flujo del compañero en enums existentes
ALTER TYPE "EstadoParticipante" ADD VALUE IF NOT EXISTS 'PENDIENTE';
ALTER TYPE "EstadoParticipante" ADD VALUE IF NOT EXISTS 'FORMULARIO_GENERADO';
ALTER TYPE "EstadoParticipante" ADD VALUE IF NOT EXISTS 'RECHAZADO';
ALTER TYPE "EstadoParticipante" ADD VALUE IF NOT EXISTS 'CERTIFICADO_EMITIDO';

ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'PARTICIPANTE_APROBADO';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'PARTICIPANTE_RECHAZADO';
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'CERTIFICADO_EMITIDO';

-- Columnas nuevas del flujo del compañero en participantes_capacitacion
ALTER TABLE "participantes_capacitacion" ADD COLUMN "subCodigo" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "nombreCompleto" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "carnet" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "expedido" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "esRepresentante" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "observacion" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "pdfFormularioRuta" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "pdfFormularioHash" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "pdfCertificadoRuta" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "pdfCertificadoHash" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "codigoCertificado" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "fechaEmisionCert" TIMESTAMP(3);
ALTER TABLE "participantes_capacitacion" ADD COLUMN "instructor" TEXT;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "calificacion" DOUBLE PRECISION;
ALTER TABLE "participantes_capacitacion" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill de filas existentes y del campo updatedAt nuevo
UPDATE "participantes_capacitacion" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
ALTER TABLE "participantes_capacitacion" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "participantes_capacitacion" SET "nombreCompleto" = "nombre" WHERE "nombreCompleto" IS NULL;
UPDATE "participantes_capacitacion" SET "carnet" = "ci" WHERE "carnet" IS NULL;

-- NOTA: el DEFAULT 'PENDIENTE' de participantes_cursos.estado va en la
-- migración siguiente (..._default): Postgres (error 55P04) no permite usar
-- un valor nuevo de enum en la misma transacción donde se creó con ADD VALUE.

-- Índices únicos parciales (permiten múltiples NULL)
CREATE UNIQUE INDEX "participantes_capacitacion_subCodigo_key" ON "participantes_capacitacion"("subCodigo") WHERE "subCodigo" IS NOT NULL;
CREATE UNIQUE INDEX "participantes_capacitacion_codigoCertificado_key" ON "participantes_capacitacion"("codigoCertificado") WHERE "codigoCertificado" IS NOT NULL;
