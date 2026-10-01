/**
 * 🌱 Seed E2E Fixtures — datos que ningún otro seed crea
 *
 * Huecos que cubre (auditoría 2026-09-30 post-incidente):
 *  - CERT-2026-0001 (PROFESIONAL): no existe en seed.ts, seed-cumplimiento.ts,
 *    seed-profesionales.ts ni seed-capacitaciones.ts. Lo requieren los tests
 *    "profesionales 5" y "profesionales 6".
 *  - Estados acumulados CERTIFICADO_EMITIDO que el E2E asume pero los seeds
 *    dejan en APROBADA. Lo requiere "cumplimiento 9".
 *  - SIPPCI-JUR-2026-002 quedaba CERTIFICADO_EMITIDO sin certificado (inconsistencia
 *    lógica). Se resuelve creando su certificado SIPPCI.
 *
 * IDEMPOTENTE: correrlo N veces no duplica filas ni altera fechas ya emitidas.
 * Depende de que seed.ts, seed-cumplimiento.ts y seed-profesionales.ts se hayan
 * ejecutado antes (necesitan las solicitudes y los usuarios_internos).
 */
import { PrismaClient, EstadoSolicitud, TipoCertificado } from '@prisma/client';

const prisma = new PrismaClient();

const resumen = {
  creados: 0,
  actualizados: 0,
  sinCambios: 0,
  advertencias: 0,
  errores: 0,
};

const ESTADOS_FIXTURES = [
  'SIPPCI-JUR-2026-002',
  'SIPPCI-NAT-2026-003',
  'SOL-NAT-2026-003',
];

const CERTIFICADOS_FIXTURES = [
  {
    codigoCertificado: 'CERT-2026-0001',
    tipo: TipoCertificado.PROFESIONAL,
    solicitudCodigo: 'SOL-JUR-2026-002',
  },
  {
    codigoCertificado: 'CERT-SIPPCI-2026-0002',
    tipo: TipoCertificado.SIPPCI,
    solicitudCodigo: 'SIPPCI-JUR-2026-002',
  },
];

function enDosAnios(desde: Date): Date {
  const vigencia = new Date(desde);
  vigencia.setFullYear(vigencia.getFullYear() + 2);
  return vigencia;
}

async function resolverEmitidoPor(): Promise<number | null> {
  const interno =
    (await prisma.usuarios_internos.findFirst({
      where: { activo: true, rol: 'ADMIN' },
      orderBy: { id: 'asc' },
    })) ??
    (await prisma.usuarios_internos.findFirst({
      where: { activo: true },
      orderBy: { id: 'asc' },
    }));

  if (!interno) {
    resumen.errores++;
    console.error('❌ No hay usuarios_internos; correr prisma/seed.ts primero');
    return null;
  }
  return interno.id;
}

async function forzarEstado(codigoFormulario: string): Promise<void> {
  const solicitud = await prisma.solicitudes.findUnique({
    where: { codigoFormulario },
  });

  if (!solicitud) {
    resumen.errores++;
    console.error(`❌ Falta la solicitud ${codigoFormulario} (correr seed-cumplimiento / seed-profesionales)`);
    return;
  }

  if (solicitud.estado === EstadoSolicitud.CERTIFICADO_EMITIDO) {
    resumen.sinCambios++;
    console.log(`➖ ${codigoFormulario} ya estaba en CERTIFICADO_EMITIDO`);
    return;
  }

  const fechaVigencia = enDosAnios(new Date());
  await prisma.solicitudes.update({
    where: { id: solicitud.id },
    data: { estado: EstadoSolicitud.CERTIFICADO_EMITIDO, fechaVigencia },
  });
  resumen.actualizados++;
  console.log(`🔄 ${codigoFormulario}: ${solicitud.estado} → CERTIFICADO_EMITIDO`);
}

async function asegurarCertificado(
  codigoCertificado: string,
  tipo: TipoCertificado,
  solicitudCodigo: string,
  emitidoPorId: number,
): Promise<void> {
  const solicitud = await prisma.solicitudes.findUnique({
    where: { codigoFormulario: solicitudCodigo },
  });

  if (!solicitud) {
    resumen.errores++;
    console.error(`❌ Falta la solicitud ${solicitudCodigo}; correr los seeds base primero`);
    return;
  }

  const existente = await prisma.certificados.findUnique({
    where: { codigoCertificado },
  });

  if (existente) {
    if (existente.solicitudId !== solicitud.id) {
      resumen.advertencias = (resumen.advertencias || 0) + 1;
      console.warn(`⚠️ ${codigoCertificado} ya existe en otra solicitud. Omitiendo.`);
      return;
    }

    const patch: { activo?: boolean; tipo?: TipoCertificado } = {};
    if (!existente.activo) patch.activo = true;
    if (existente.tipo !== tipo) patch.tipo = tipo;

    if (Object.keys(patch).length === 0) {
      resumen.sinCambios++;
      console.log(`➖ ${codigoCertificado} ya existe y es correcto`);
      return;
    }

    await prisma.certificados.update({ where: { codigoCertificado }, data: patch });
    resumen.actualizados++;
    console.log(`🔄 ${codigoCertificado} normalizado`);
    return;
  }

  const deLaSolicitud = await prisma.certificados.findUnique({
    where: { solicitudId: solicitud.id },
  });

  if (deLaSolicitud) {
    resumen.errores++;
    console.error(
      `❌ ${solicitudCodigo} ya tiene el certificado ${deLaSolicitud.codigoCertificado}; no se crea ${codigoCertificado} (evita duplicar)`,
    );
    return;
  }

  const fechaEmision = new Date();
  await prisma.certificados.create({
    data: {
      codigoCertificado,
      tipo,
      solicitudId: solicitud.id,
      emitidoPorId,
      fechaEmision,
      fechaVigencia: enDosAnios(fechaEmision),
      activo: true,
    },
  });
  resumen.creados++;
  console.log(`✅ Certificado creado: ${codigoCertificado} (${tipo}) → ${solicitudCodigo}`);
}

async function main() {
  console.log('🌱 Seed E2E Fixtures — iniciando...');

  const emitidoPorId = await resolverEmitidoPor();
  if (emitidoPorId === null) process.exit(1);

  console.log(`\n1/2 Estados acumulados (CERTIFICADO_EMITIDO)`);
  for (const codigo of ESTADOS_FIXTURES) {
    await forzarEstado(codigo);
  }

  console.log(`\n2/2 Certificados que ningún seed crea`);
  for (const cert of CERTIFICADOS_FIXTURES) {
    await asegurarCertificado(cert.codigoCertificado, cert.tipo, cert.solicitudCodigo, emitidoPorId);
  }

  console.log('\n📊 Resumen Seed E2E Fixtures:');
  console.log(`  ✅ Creados:      ${resumen.creados}`);
  console.log(`  🔄 Actualizados: ${resumen.actualizados}`);
  console.log(`  ➖ Sin cambios:  ${resumen.sinCambios}`);
  console.log(`  ⚠️ Advertencias: ${resumen.advertencias}`);
  console.log(`  ❌ Errores:      ${resumen.errores}`);

  if (resumen.errores > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
