-- CreateEnum
CREATE TYPE "EstadoProgramacion" AS ENUM ('PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO', 'REPROGRAMADO');

-- CreateEnum
CREATE TYPE "EstadoCertificadoCapacitacion" AS ENUM ('EMITIDO', 'VENCIDO', 'REVOCADO');

-- CreateTable
CREATE TABLE "instructores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "ci" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "especialidad" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programacion_curso" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "instructorId" INTEGER,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "lugar" TEXT,
    "cupo" INTEGER,
    "estado" "EstadoProgramacion" NOT NULL DEFAULT 'PROGRAMADO',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programacion_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participante_programacion" (
    "id" SERIAL NOT NULL,
    "programacionId" INTEGER NOT NULL,
    "participanteId" INTEGER NOT NULL,
    "puntaje" DOUBLE PRECISION,
    "aprobado" BOOLEAN,
    "asistencia" BOOLEAN,
    "certificadoId" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participante_programacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificado_capacitacion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "participanteId" INTEGER NOT NULL,
    "programacionId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "instructorId" INTEGER,
    "emitidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaHasta" TIMESTAMP(3) NOT NULL,
    "rutaPdf" TEXT,
    "qrUrl" TEXT,
    "emitidoPorId" INTEGER,
    "estado" "EstadoCertificadoCapacitacion" NOT NULL DEFAULT 'EMITIDO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificado_capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instructores_ci_key" ON "instructores"("ci");

-- CreateIndex
CREATE INDEX "instructores_activo_idx" ON "instructores"("activo");

-- CreateIndex
CREATE INDEX "programacion_curso_cursoId_idx" ON "programacion_curso"("cursoId");

-- CreateIndex
CREATE INDEX "programacion_curso_instructorId_idx" ON "programacion_curso"("instructorId");

-- CreateIndex
CREATE INDEX "programacion_curso_estado_idx" ON "programacion_curso"("estado");

-- CreateIndex
CREATE INDEX "participante_programacion_participanteId_idx" ON "participante_programacion"("participanteId");

-- CreateIndex
CREATE INDEX "participante_programacion_certificadoId_idx" ON "participante_programacion"("certificadoId");

-- CreateIndex
CREATE UNIQUE INDEX "participante_programacion_programacionId_participanteId_key" ON "participante_programacion"("programacionId", "participanteId");

-- CreateIndex
CREATE UNIQUE INDEX "certificado_capacitacion_codigo_key" ON "certificado_capacitacion"("codigo");

-- CreateIndex
CREATE INDEX "certificado_capacitacion_participanteId_idx" ON "certificado_capacitacion"("participanteId");

-- CreateIndex
CREATE INDEX "certificado_capacitacion_programacionId_idx" ON "certificado_capacitacion"("programacionId");

-- CreateIndex
CREATE INDEX "certificado_capacitacion_estado_idx" ON "certificado_capacitacion"("estado");

-- AddForeignKey
ALTER TABLE "programacion_curso" ADD CONSTRAINT "programacion_curso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programacion_curso" ADD CONSTRAINT "programacion_curso_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participante_programacion" ADD CONSTRAINT "participante_programacion_programacionId_fkey" FOREIGN KEY ("programacionId") REFERENCES "programacion_curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participante_programacion" ADD CONSTRAINT "participante_programacion_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participantes_capacitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participante_programacion" ADD CONSTRAINT "participante_programacion_certificadoId_fkey" FOREIGN KEY ("certificadoId") REFERENCES "certificado_capacitacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificado_capacitacion" ADD CONSTRAINT "certificado_capacitacion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificado_capacitacion" ADD CONSTRAINT "certificado_capacitacion_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "instructores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
