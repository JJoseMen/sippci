-- AlterEnum
-- PostgreSQL no permite eliminar un valor de un ENUM: se recrea el tipo.
-- El enum "EstadoParticipante" se usa en 2 tablas:
--   participantes_capacitacion.estado  (schema.prisma:416)
--   participantes_cursos.estado        (schema.prisma:430)
-- Por lo tanto ambas columnas deben convertirse antes del DROP TYPE.
-- Se quitan y restauran los DEFAULT porque estan tipados con el enum viejo.

-- AlterTable
ALTER TABLE "participantes_capacitacion" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "participantes_cursos" ALTER COLUMN "estado" DROP DEFAULT;

-- AlterEnum
ALTER TYPE "EstadoParticipante" RENAME TO "EstadoParticipante_old";

CREATE TYPE "EstadoParticipante" AS ENUM ('INSCRITO', 'APROBADO', 'REPROBADO');

-- AlterTable
ALTER TABLE "participantes_capacitacion"
  ALTER COLUMN "estado" TYPE "EstadoParticipante"
  USING "estado"::text::"EstadoParticipante";

-- AlterTable
ALTER TABLE "participantes_cursos"
  ALTER COLUMN "estado" TYPE "EstadoParticipante"
  USING "estado"::text::"EstadoParticipante";

-- AlterTable
ALTER TABLE "participantes_capacitacion" ALTER COLUMN "estado" SET DEFAULT 'INSCRITO';
ALTER TABLE "participantes_cursos" ALTER COLUMN "estado" SET DEFAULT 'INSCRITO';

-- DropType
DROP TYPE "EstadoParticipante_old";
