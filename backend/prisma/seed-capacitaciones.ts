/**
 * 🌱 Seed Capacitaciones — cursos base
 *
 * NO ejecutar como parte del seed principal. Correr manualmente:
 *   npx ts-node prisma/seed-capacitaciones.ts
 *
 * Verificación schema.prisma:
 * - modelo cursos: nombre, descripcion, modalidad, duracionHoras, costoBsf, activo
 * - Enums: Sin enum para modalidad (String libre en schema actual)
 * - NOTA: El modelo cursos NO tiene constraint unique en 'nombre'
 *   → Usamos upsert por ID secuencial (1-4) para idempotencia
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CURSOS_BASE = [
  {
    id: 1,
    nombre: 'EXTINTORES',
    descripcion: 'Manejo de Extintores',
    modalidad: 'PRESENCIAL',
    duracionHoras: 4,
    costoBsf: 0,
    activo: true,
  },
  {
    id: 2,
    nombre: 'PRIMEROS_AUXILIOS',
    descripcion: 'Primeros Auxilios',
    modalidad: 'PRESENCIAL',
    duracionHoras: 8,
    costoBsf: 0,
    activo: true,
  },
  {
    id: 3,
    nombre: 'EVACUACION',
    descripcion: 'Procedimiento Evacuación',
    modalidad: 'PRESENCIAL',
    duracionHoras: 4,
    costoBsf: 0,
    activo: true,
  },
  {
    id: 4,
    nombre: 'TRABAJOS_EN_ALTURA',
    descripcion: 'Trabajo de Altura',
    modalidad: 'PRESENCIAL',
    duracionHoras: 8,
    costoBsf: 0,
    activo: true,
  },
] as const;

async function main() {
  console.log('🌱 Seed Capacitaciones — iniciando...');

  const resultados = { creados: 0, actualizados: 0, errores: 0 };

  for (const curso of CURSOS_BASE) {
    try {
      const existing = await prisma.cursos.findUnique({ where: { id: curso.id } });

      if (existing) {
        await prisma.cursos.update({
          where: { id: curso.id },
          data: {
            nombre: curso.nombre,
            descripcion: curso.descripcion,
            modalidad: curso.modalidad,
            duracionHoras: curso.duracionHoras,
            costoBsf: curso.costoBsf,
            activo: curso.activo,
          },
        });
        resultados.actualizados++;
        console.log(`🔄 Actualizado: ${curso.nombre} (id=${curso.id})`);
      } else {
        await prisma.cursos.create({ data: curso });
        resultados.creados++;
        console.log(`✅ Creado: ${curso.nombre} (id=${curso.id})`);
      }
    } catch (error) {
      resultados.errores++;
      console.error(`❌ Error con ${curso.nombre}:`, error);
    }
  }

  console.log('\n📊 Resumen Seed Capacitaciones:');
  console.log(`  ✅ Creados:     ${resultados.creados}`);
  console.log(`  🔄 Actualizados: ${resultados.actualizados}`);
  console.log(`  ❌ Errores:     ${resultados.errores}`);
  console.log(`  📚 Total cursos: ${CURSOS_BASE.length}`);

  // Verificación final: listar todos
  const todos = await prisma.cursos.findMany({ orderBy: { id: 'asc' } });
  console.log('\n📋 Cursos en BD:');
  for (const c of todos) {
    console.log(`  ${c.id}. ${c.nombre} — ${c.descripcion} (${c.modalidad}, ${c.duracionHoras}h, Bs.${c.costoBsf}, ${c.activo ? 'activo' : 'inactivo'})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });