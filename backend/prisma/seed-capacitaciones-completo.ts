/**
 * 🌱 Seed Capacitaciones — fixtures completos (FASE 3.3)
 *
 * NO registrar en package.json > prisma.seed todavía.
 * NO ejecutar como parte del seed principal. Correr manualmente cuando se pida:
 *   npx ts-node prisma/seed-capacitaciones-completo.ts
 *
 * Crea / garantiza (idempotente, solo upsert — nunca borra):
 *   - 4 cursos base            (si faltan)
 *   - 3 instructores           CI 5123456, 5234567, 5345678
 *   - 4 programaciones         1 por curso, ids fijos 1-4
 *   - 6 participantes          CI 1000001-1000006
 *   - 6 inscripciones          2 por programación en las 2 primeras del listado
 *
 * Contrato de ids/estados (lo exige frontend/e2e/capacitaciones.spec.ts):
 *   #1 PRIMEROS_AUXILIOS  CANCELADO    (test 2: 'Cancelado')
 *   #2 EVACUACION         FINALIZADO   (tests 3 y 5: único FINALIZADO)
 *   #3 TRABAJOS_EN_ALTURA REPROGRAMADO (test 6: exactamente Ana Torres + Luis Mamani)
 *   #4 EXTINTORES         PROGRAMADO   (tests 4 y 10: 'EXTINTORES #4', 'Aula Test Cupo')
 *
 * El listado del frontend ordena por fechaInicio desc, así que "las 2 primeras"
 * de la UI son #4 y #2: a ambas se le cargan 2 participantes.
 *
 * NOTA: este seed solo garantiza que existan las inscripciones esperadas; no
 * elimina inscripciones hechas a mano en esas programaciones.
 */
import { EstadoParticipante, EstadoProgramacion, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CURSOS = [
  { nombre: 'EXTINTORES', descripcion: 'Manejo de Extintores', duracionHoras: 4 },
  { nombre: 'PRIMEROS_AUXILIOS', descripcion: 'Primeros Auxilios', duracionHoras: 8 },
  { nombre: 'EVACUACION', descripcion: 'Procedimiento Evacuacion', duracionHoras: 4 },
  { nombre: 'TRABAJOS_EN_ALTURA', descripcion: 'Trabajo de Altura', duracionHoras: 8 },
] as const;

const INSTRUCTORES = [
  {
    ci: '5123456',
    nombre: 'Marco Antonio',
    apellido: 'Vargas Peña',
    email: 'marco.vargas@sippci.bo',
    telefono: '7110001',
    especialidad: 'Prevención de Incendios',
  },
  {
    ci: '5234567',
    nombre: 'Carla Fernanda',
    apellido: 'Rojas Mamani',
    email: 'carla.rojas@sippci.bo',
    telefono: '7110002',
    especialidad: 'Primeros Auxilios',
  },
  {
    ci: '5345678',
    nombre: 'Diego Alonzo',
    apellido: 'Quispe Ticona',
    email: 'diego.quispe@sippci.bo',
    telefono: '7110003',
    especialidad: 'Trabajo en Altura',
  },
] as const;

const PROGRAMACIONES = [
  {
    id: 1,
    curso: 'PRIMEROS_AUXILIOS',
    instructorCi: '5234567',
    fechaInicio: '2026-10-20T09:00:00.000Z',
    fechaFin: '2026-10-20T17:00:00.000Z',
    lugar: 'Aula 1',
    cupo: 20,
    estado: EstadoProgramacion.CANCELADO,
    observaciones: 'Programacion cancelada (fixture E2E)',
  },
  {
    id: 2,
    curso: 'EVACUACION',
    instructorCi: '5123456',
    fechaInicio: '2026-11-10T09:00:00.000Z',
    fechaFin: '2026-11-10T17:00:00.000Z',
    lugar: 'Aula 2',
    cupo: 15,
    estado: EstadoProgramacion.FINALIZADO,
    observaciones: 'Curso finalizado (fixture E2E)',
  },
  {
    id: 3,
    curso: 'TRABAJOS_EN_ALTURA',
    instructorCi: '5345678',
    fechaInicio: '2026-10-20T09:00:00.000Z',
    fechaFin: '2026-10-20T17:00:00.000Z',
    lugar: 'Salon B',
    cupo: 12,
    estado: EstadoProgramacion.REPROGRAMADO,
    observaciones: 'Reprogramada (fixture E2E)',
  },
  {
    id: 4,
    curso: 'EXTINTORES',
    instructorCi: '5123456',
    fechaInicio: '2026-12-10T09:00:00.000Z',
    fechaFin: '2026-12-10T13:00:00.000Z',
    lugar: 'Aula Test Cupo',
    cupo: 2,
    estado: EstadoProgramacion.PROGRAMADO,
    observaciones: 'Programacion futura de ejemplo (fixture E2E)',
  },
] as const;

const PARTICIPANTES = [
  {
    ci: '1000001',
    nombre: 'Juan Perez',
    email: 'juan.perez@bomberos.bo',
    telefono: '70000001',
    estado: EstadoParticipante.APROBADO,
  },
  {
    ci: '1000002',
    nombre: 'Maria Lopez',
    email: 'maria.lopez@bomberos.bo',
    telefono: '70000002',
    estado: EstadoParticipante.REPROBADO,
  },
  {
    ci: '1000003',
    nombre: 'Carlos Garcia',
    email: null,
    telefono: null,
    estado: EstadoParticipante.INSCRITO,
  },
  {
    ci: '1000004',
    nombre: 'Ana Torres',
    email: null,
    telefono: null,
    estado: EstadoParticipante.INSCRITO,
  },
  {
    ci: '1000005',
    nombre: 'Luis Mamani',
    email: null,
    telefono: null,
    estado: EstadoParticipante.INSCRITO,
  },
  {
    ci: '1000006',
    nombre: 'Rosa Quispe Mamani',
    email: 'rosa.quispe@bomberos.bo',
    telefono: '70000006',
    estado: EstadoParticipante.INSCRITO,
  },
] as const;

/** 2 por programación en las 2 primeras de la UI (#4 y #2) + 2 en #3 (test 6). */
const INSCRIPCIONES = [
  { programacionId: 4, participanteCi: '1000001' },
  { programacionId: 4, participanteCi: '1000002' },
  { programacionId: 2, participanteCi: '1000003' },
  { programacionId: 2, participanteCi: '1000006' },
  { programacionId: 3, participanteCi: '1000004' },
  { programacionId: 3, participanteCi: '1000005' },
] as const;

const resultados = { creados: 0, actualizados: 0, sinCambios: 0, errores: 0 };

async function contar() {
  return {
    instructores: await prisma.instructores.count(),
    cursos: await prisma.cursos.count(),
    programaciones: await prisma.programacion_curso.count(),
    participantes: await prisma.participantes_capacitacion.count(),
    inscripciones: await prisma.participante_programacion.count(),
  };
}

async function main() {
  console.log('🌱 Seed Capacitaciones (completo) — iniciando...');

  const antes = await contar();
  console.log('📦 Registros ANTES:', antes);

  // 1. Cursos base (solo si faltan)
  for (const curso of CURSOS) {
    const existente = await prisma.cursos.findUnique({ where: { nombre: curso.nombre } });
    if (existente) {
      resultados.sinCambios++;
      continue;
    }
    await prisma.cursos.create({
      data: {
        nombre: curso.nombre,
        descripcion: curso.descripcion,
        modalidad: 'PRESENCIAL',
        duracionHoras: curso.duracionHoras,
        costoBsf: 0,
        activo: true,
      },
    });
    resultados.creados++;
    console.log(`✅ Curso creado: ${curso.nombre}`);
  }

  // 2. Instructores (upsert por CI único)
  for (const instructor of INSTRUCTORES) {
    const existente = await prisma.instructores.findUnique({ where: { ci: instructor.ci } });
    const data = { ...instructor, activo: true };
    if (existente) {
      await prisma.instructores.update({ where: { ci: instructor.ci }, data });
      resultados.actualizados++;
      console.log(`🔄 Instructor actualizado: CI ${instructor.ci}`);
    } else {
      await prisma.instructores.create({ data });
      resultados.creados++;
      console.log(`✅ Instructor creado: CI ${instructor.ci}`);
    }
  }

  // 3. Programaciones (upsert por id fijo)
  for (const programacion of PROGRAMACIONES) {
    const curso = await prisma.cursos.findUnique({ where: { nombre: programacion.curso } });
    if (!curso) {
      resultados.errores++;
      console.error(`❌ Curso no encontrado: ${programacion.curso}`);
      continue;
    }
    const instructor = await prisma.instructores.findUnique({
      where: { ci: programacion.instructorCi },
    });
    if (!instructor) {
      resultados.errores++;
      console.error(`❌ Instructor no encontrado: CI ${programacion.instructorCi}`);
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
      await prisma.programacion_curso.update({ where: { id: programacion.id }, data });
      resultados.actualizados++;
      console.log(`🔄 Programación #${programacion.id} actualizada (${programacion.estado})`);
    } else {
      await prisma.programacion_curso.create({ data: { id: programacion.id, ...data } });
      resultados.creados++;
      console.log(`✅ Programación #${programacion.id} creada (${programacion.estado})`);
    }
  }

  // 4. Participantes (la tabla no tiene unique en ci → findFirst)
  for (const participante of PARTICIPANTES) {
    const existente = await prisma.participantes_capacitacion.findFirst({
      where: { ci: participante.ci },
    });
    const data = { ...participante };
    if (existente) {
      await prisma.participantes_capacitacion.update({ where: { id: existente.id }, data });
      resultados.actualizados++;
      console.log(`🔄 Participante actualizado: CI ${participante.ci}`);
    } else {
      await prisma.participantes_capacitacion.create({ data });
      resultados.creados++;
      console.log(`✅ Participante creado: CI ${participante.ci}`);
    }
  }

  // 5. Inscripciones (upsert por @@unique([programacionId, participanteId]))
  for (const inscripcion of INSCRIPCIONES) {
    const participante = await prisma.participantes_capacitacion.findFirst({
      where: { ci: inscripcion.participanteCi },
    });
    if (!participante) {
      resultados.errores++;
      console.error(`❌ Participante no encontrado: CI ${inscripcion.participanteCi}`);
      continue;
    }
    const where = {
      programacionId_participanteId: {
        programacionId: inscripcion.programacionId,
        participanteId: participante.id,
      },
    };
    const existente = await prisma.participante_programacion.findUnique({ where });
    if (existente) {
      resultados.sinCambios++;
      continue;
    }
    await prisma.participante_programacion.create({
      data: {
        programacionId: inscripcion.programacionId,
        participanteId: participante.id,
      },
    });
    resultados.creados++;
    console.log(
      `✅ Inscripción creada: #${inscripcion.programacionId} ← CI ${inscripcion.participanteCi}`,
    );
  }

  const despues = await contar();
  console.log('\n📊 Resumen Seed Capacitaciones (completo):');
  console.log(`  ✅ Creados:      ${resultados.creados}`);
  console.log(`  🔄 Actualizados: ${resultados.actualizados}`);
  console.log(`  ⏸️  Sin cambios:  ${resultados.sinCambios}`);
  console.log(`  ❌ Errores:       ${resultados.errores}`);
  console.log('📦 Registros DESPUÉS:', despues);

  const programaciones = await prisma.programacion_curso.findMany({
    orderBy: { id: 'asc' },
    include: { curso: true, instructor: true, participantes: { include: { participante: true } } },
  });
  console.log('\n📋 Programaciones en BD:');
  for (const p of programaciones) {
    const inscritos = p.participantes
      .map((i) => `${i.participante.nombre} (CI ${i.participante.ci})`)
      .join(', ');
    console.log(
      `  ${p.id}. ${p.curso.nombre} — ${p.estado} · ${p.lugar ?? 'sin lugar'} · cupo ${
        p.cupo ?? '∞'
      } · instructor ${p.instructor ? `${p.instructor.nombre} ${p.instructor.apellido}` : '—'}` +
        `\n      inscritos: ${inscritos || 'ninguno'}`,
    );
  }

  if (resultados.errores > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
