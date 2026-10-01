/**
 * 🌱 Seed Programaciones — FASE 3.3
 *
 * NO registrar en package.json > prisma.seed todavía.
 * NO ejecutar como parte del seed principal. Correr manualmente cuando se pida:
 *   npx ts-node prisma/seed-programaciones.ts
 *
 * Idempotente: verifica existencia por id antes de crear/actualizar.
 * Crea:
 *   - 1 instructor (si no existe, por CI único)
 *   - 3 programaciones de ejemplo ligadas a los 4 cursos base
 */
import { EstadoProgramacion, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INSTRUCTOR_BASE = {
  ci: '1111111',
  nombre: 'Maria',
  apellido: 'Rojas Silva',
  email: 'maria.rojas@bomberos.bo',
  telefono: '71111111',
  especialidad: 'Prevencion de Incendios',
};

const PROGRAMACIONES_BASE = [
  {
    id: 1,
    cursoNombre: 'EXTINTORES',
    fechaInicio: '2026-11-15T09:00:00.000Z',
    fechaFin: '2026-11-15T13:00:00.000Z',
    lugar: 'Aula 1 - Sede Central',
    cupo: 20,
    estado: EstadoProgramacion.PROGRAMADO,
    observaciones: 'Programacion futura de ejemplo',
  },
  {
    id: 2,
    cursoNombre: 'PRIMEROS_AUXILIOS',
    fechaInicio: '2026-10-01T09:00:00.000Z',
    fechaFin: '2026-10-01T17:00:00.000Z',
    lugar: 'Aula 2 - Sede Central',
    cupo: 15,
    estado: EstadoProgramacion.EN_CURSO,
    observaciones: 'Curso en ejecucion',
  },
  {
    id: 3,
    cursoNombre: 'EVACUACION',
    fechaInicio: '2026-08-10T09:00:00.000Z',
    fechaFin: '2026-08-10T13:00:00.000Z',
    lugar: 'Planta baja',
    cupo: 25,
    estado: EstadoProgramacion.FINALIZADO,
    observaciones: 'Curso finalizado',
  },
] as const;

async function ensureInstructor() {
  const existente = await prisma.instructores.findUnique({
    where: { ci: INSTRUCTOR_BASE.ci },
  });

  if (existente) {
    console.log(`↩️  Instructor ya existe: ${existente.nombre} ${existente.apellido} (id=${existente.id})`);
    return existente;
  }

  const creado = await prisma.instructores.create({ data: INSTRUCTOR_BASE });
  console.log(`✅ Instructor creado: ${creado.nombre} ${creado.apellido} (id=${creado.id})`);
  return creado;
}

async function main() {
  console.log('🌱 Seed Programaciones — iniciando...');

  const instructor = await ensureInstructor();
  const resultados = { creados: 0, actualizados: 0, errores: 0 };

  for (const programacion of PROGRAMACIONES_BASE) {
    try {
      const curso = await prisma.cursos.findUnique({
        where: { nombre: programacion.cursoNombre },
      });
      if (!curso) {
        resultados.errores++;
        console.error(`❌ Curso no encontrado: ${programacion.cursoNombre}`);
        continue;
      }

      const data = {
        cursoId: curso.id,
        instructorId: instructor.id,
        fechaInicio: programacion.fechaInicio,
        fechaFin: programacion.fechaFin,
        lugar: programacion.lugar,
        cupo: programacion.cupo,
        estado: programacion.estado,
        observaciones: programacion.observaciones,
      };

      const existente = await prisma.programacion_curso.findUnique({
        where: { id: programacion.id },
      });

      if (existente) {
        await prisma.programacion_curso.update({
          where: { id: programacion.id },
          data,
        });
        resultados.actualizados++;
        console.log(
          `🔄 Actualizada: id=${programacion.id} ${programacion.cursoNombre} (${programacion.estado})`,
        );
      } else {
        await prisma.programacion_curso.create({
          data: { id: programacion.id, ...data },
        });
        resultados.creados++;
        console.log(
          `✅ Creada: id=${programacion.id} ${programacion.cursoNombre} (${programacion.estado})`,
        );
      }
    } catch (error) {
      resultados.errores++;
      console.error(`❌ Error con programacion id=${programacion.id}:`, error);
    }
  }

  console.log('\n📊 Resumen Seed Programaciones:');
  console.log(`  ✅ Creadas:      ${resultados.creados}`);
  console.log(`  🔄 Actualizadas: ${resultados.actualizados}`);
  console.log(`  ❌ Errores:       ${resultados.errores}`);

  const todas = await prisma.programacion_curso.findMany({
    orderBy: { id: 'asc' },
    include: { curso: true, instructor: true },
  });
  console.log('\n📋 Programaciones en BD:');
  for (const p of todas) {
    console.log(
      `  ${p.id}. ${p.curso.nombre} — ${p.estado} (${p.fechaInicio.toISOString()} → ${
        p.fechaFin ? p.fechaFin.toISOString() : 'sin fecha fin'
      }) en ${p.lugar ?? 'sin lugar'} | instructor: ${
        p.instructor ? `${p.instructor.nombre} ${p.instructor.apellido}` : 'sin asignar'
      }`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
