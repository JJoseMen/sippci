import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoCertificadoCapacitacion,
  EstadoParticipante,
  EstadoProgramacion,
  Prisma,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificadosPdfService } from '../certificados/certificados-pdf.service';
import { EmitirCertificadoCapacitacionDto } from './dto/emitir-certificado-capacitacion.dto';
import { EmitirLoteCertificadoDto } from './dto/emitir-lote-certificado.dto';
import { QueryCertificadoCapacitacionDto } from './dto/query-certificado-capacitacion.dto';

const ESTADOS_APTOS_EMISION: EstadoProgramacion[] = [
  EstadoProgramacion.EN_CURSO,
  EstadoProgramacion.FINALIZADO,
];

const VIGENCIA_ANIOS = 2;

const INCLUDE_CERTIFICADO = {
  curso: true,
  instructor: true,
  participanteProgramacion: {
    include: {
      participante: true,
      programacion: true,
    },
  },
} satisfies Prisma.certificado_capacitacionInclude;

type CertificadoConIncludes = Prisma.certificado_capacitacionGetPayload<{
  include: typeof INCLUDE_CERTIFICADO;
}>;

@Injectable()
export class CertificadosCapacitacionService {
  private readonly logger = new Logger(CertificadosCapacitacionService.name);

  constructor(
    private prisma: PrismaService,
    private pdfService: CertificadosPdfService,
  ) {}

  // ============================================================
  // LISTADO
  // ============================================================

  async listar(query: QueryCertificadoCapacitacionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.certificado_capacitacionWhereInput = {};

    if (query.search) {
      const texto = query.search;
      const coincidentes = await this.prisma.participantes_capacitacion.findMany({
        where: {
          OR: [
            { nombre: { contains: texto, mode: 'insensitive' } },
            { ci: { contains: texto, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.OR = [
        { codigo: { contains: texto, mode: 'insensitive' } },
        { participanteId: { in: coincidentes.map((c) => c.id) } },
      ];
    }

    if (query.programacionId !== undefined) {
      where.participanteProgramacion = {
        some: { programacionId: query.programacionId },
      };
    }
    if (query.cursoId !== undefined) where.cursoId = query.cursoId;
    if (query.estado) where.estado = query.estado;

    const [items, total] = await Promise.all([
      this.prisma.certificado_capacitacion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ emitidoEn: 'desc' }, { id: 'desc' }],
        include: INCLUDE_CERTIFICADO,
      }),
      this.prisma.certificado_capacitacion.count({ where }),
    ]);

    return {
      items: items.map((c) => this.mapear(c)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async obtenerPorCodigo(codigo: string) {
    const cert = await this.prisma.certificado_capacitacion.findUnique({
      where: { codigo },
      include: INCLUDE_CERTIFICADO,
    });
    if (!cert) throw new NotFoundException('Certificado no encontrado');
    return this.mapear(cert);
  }

  // ============================================================
  // EMISION INDIVIDUAL
  // ============================================================

  async emitir(dto: EmitirCertificadoCapacitacionDto, userId: number) {
    const programacion = await this.prisma.programacion_curso.findUnique({
      where: { id: dto.programacionId },
      include: { curso: true, instructor: true },
    });
    if (!programacion) throw new NotFoundException('Programación no encontrada');

    if (!ESTADOS_APTOS_EMISION.includes(programacion.estado)) {
      throw new BadRequestException(
        `No se puede emitir certificados en una programación en estado ` +
          `${programacion.estado}. Estados aptos: [${ESTADOS_APTOS_EMISION.join(', ')}]`,
      );
    }

    const inscripcion = await this.prisma.participante_programacion.findUnique({
      where: {
        programacionId_participanteId: {
          programacionId: dto.programacionId,
          participanteId: dto.participanteId,
        },
      },
      include: { participante: true },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    if (inscripcion.participante.estado !== EstadoParticipante.APROBADO) {
      throw new BadRequestException(
        `Solo se puede emitir certificado a participantes APROBADOS. ` +
          `Estado actual: ${inscripcion.participante.estado}`,
      );
    }

    if (inscripcion.certificadoId !== null) {
      throw new ConflictException(
        'El participante ya tiene un certificado emitido en esta programación',
      );
    }

    const duplicado = await this.prisma.certificado_capacitacion.findFirst({
      where: {
        programacionId: dto.programacionId,
        participanteId: dto.participanteId,
      },
    });
    if (duplicado) {
      throw new ConflictException(
        `El participante ya tiene el certificado ${duplicado.codigo}`,
      );
    }

    const codigo = await this.generarCodigoCertificado();
    const emitidoEn = new Date();
    const vigenciaHasta = new Date(emitidoEn);
    vigenciaHasta.setFullYear(vigenciaHasta.getFullYear() + VIGENCIA_ANIOS);

    const certificado = await this.prisma.$transaction(async (tx) => {
      const cert = await tx.certificado_capacitacion.create({
        data: {
          codigo,
          participanteId: dto.participanteId,
          programacionId: dto.programacionId,
          cursoId: programacion.cursoId,
          instructorId: programacion.instructorId,
          emitidoEn,
          vigenciaHasta,
          emitidoPorId: userId,
          estado: EstadoCertificadoCapacitacion.EMITIDO,
        },
      });

      await tx.participante_programacion.update({
        where: { id: inscripcion.id },
        data: {
          certificadoId: cert.id,
          ...(dto.observaciones
            ? { observaciones: this.sello(inscripcion.observaciones, `[Certificado] ${dto.observaciones}`) }
            : {}),
        },
      });

      await tx.participantes_capacitacion.update({
        where: { id: dto.participanteId },
        data: { certificadoEmitido: true },
      });

      return cert;
    });

    // PDF best-effort: no bloquea la respuesta si falla
    let rutaArchivo = `uploads/certificados/${codigo}.pdf`;
    let qrBase64 = '';
    try {
      const result = await this.generarPdf(
        certificado as CertificadoConIncludes,
        programacion,
        inscripcion.participante,
      );
      rutaArchivo = result.rutaArchivo;
      qrBase64 = result.qrBase64;
      await this.prisma.certificado_capacitacion.update({
        where: { id: certificado.id },
        data: {
          rutaPdf: rutaArchivo,
          qrUrl: this.urlValidacion(codigo),
        },
      });
    } catch (e) {
      this.logger.warn(`PDF no generado para ${codigo}: ${String(e)}`);
    }

    const completo = await this.prisma.certificado_capacitacion.findUnique({
      where: { id: certificado.id },
      include: INCLUDE_CERTIFICADO,
    });

    return { ...(completo ?? certificado), rutaArchivo, qrBase64 };
  }

  // ============================================================
  // EMISION EN LOTE
  // ============================================================

  async emitirLote(dto: EmitirLoteCertificadoDto, userId: number) {
    const programacion = await this.prisma.programacion_curso.findUnique({
      where: { id: dto.programacionId },
    });
    if (!programacion) throw new NotFoundException('Programación no encontrada');

    if (!ESTADOS_APTOS_EMISION.includes(programacion.estado)) {
      throw new BadRequestException(
        `No se puede emitir certificados en una programación en estado ` +
          `${programacion.estado}. Estados aptos: [${ESTADOS_APTOS_EMISION.join(', ')}]`,
      );
    }

    const candidatos = await this.prisma.participante_programacion.findMany({
      where: {
        programacionId: dto.programacionId,
        certificadoId: null,
        participante: { estado: EstadoParticipante.APROBADO },
      },
      select: { participanteId: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const codigos: string[] = [];
    const errores: { participanteId: number; mensaje: string }[] = [];

    for (const fila of candidatos) {
      try {
        const cert = await this.emitir(
          {
            programacionId: dto.programacionId,
            participanteId: fila.participanteId,
          },
          userId,
        );
        codigos.push((cert as { codigo: string }).codigo);
      } catch (e) {
        errores.push({
          participanteId: fila.participanteId,
          mensaje: e instanceof Error ? e.message : 'Error desconocido',
        });
      }
    }

    return { emitidos: codigos.length, codigos, errores };
  }

  // ============================================================
  // DESCARGA DE PDF
  // ============================================================

  async obtenerRutaPdf(codigo: string): Promise<string> {
    const cert = await this.prisma.certificado_capacitacion.findUnique({
      where: { codigo },
      include: INCLUDE_CERTIFICADO,
    });
    if (!cert) throw new NotFoundException('Certificado no encontrado');

    const rutaAbsoluta = path.join(
      process.cwd(),
      'uploads',
      'certificados',
      `${codigo}.pdf`,
    );
    if (fs.existsSync(rutaAbsoluta)) return rutaAbsoluta;

    // Self-healing: regenerar si el archivo se perdió
    const inscripcion = cert.participanteProgramacion[0];
    if (!inscripcion) {
      throw new NotFoundException('No hay datos para regenerar el PDF');
    }
    const programacion = await this.prisma.programacion_curso.findUnique({
      where: { id: cert.programacionId },
      include: { curso: true, instructor: true },
    });
    if (!programacion) throw new NotFoundException('Programación no encontrada');

    const result = await this.generarPdf(
      cert,
      programacion,
      inscripcion.participante,
    );
    await this.prisma.certificado_capacitacion.update({
      where: { id: cert.id },
      data: { rutaPdf: result.rutaArchivo, qrUrl: this.urlValidacion(cert.codigo) },
    });

    if (!fs.existsSync(rutaAbsoluta)) {
      throw new NotFoundException('No se pudo generar el PDF del certificado');
    }
    return rutaAbsoluta;
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  /**
   * Patron identico a Profesionales/Cumplimiento: cuenta los existentes
   * con el mismo prefijo y suma 1.
   *
   * NOTA (deuda): count+1 no es atomico. Dos emisiones simultaneas pueden
   * generar el mismo codigo y chocar con el UNIQUE de la columna `codigo`.
   * Replicado adrede por consistencia; ver docs/PENDIENTES.md.
   */
  private async generarCodigoCertificado(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.certificado_capacitacion.count({
      where: { codigo: { startsWith: `CERT-CAP-${year}-` } },
    });
    const numero = String(count + 1).padStart(4, '0');
    return `CERT-CAP-${year}-${numero}`;
  }

  private urlValidacion(codigo: string): string {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    return `${frontendUrl}/validar-certificado-capacitacion/${codigo}`;
  }

  private sello(actual: string | null, texto: string): string {
    return actual ? `${actual}\n${texto}` : texto;
  }

  private calcularEstadoVigencia(vigenciaHasta: Date, estado: string): string {
    if (estado !== EstadoCertificadoCapacitacion.EMITIDO) return 'VENCIDO';
    const hoy = new Date();
    const diffMs = vigenciaHasta.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0) return 'VENCIDO';
    if (diffDias < 180) return 'POR_VENCER';
    return 'VIGENTE';
  }

  private mapear(cert: CertificadoConIncludes) {
    const inscripcion = cert.participanteProgramacion?.[0];
    return {
      id: cert.id,
      codigo: cert.codigo,
      participanteId: cert.participanteId,
      programacionId: cert.programacionId,
      cursoId: cert.cursoId,
      instructorId: cert.instructorId,
      emitidoEn: cert.emitidoEn,
      vigenciaHasta: cert.vigenciaHasta,
      rutaPdf: cert.rutaPdf,
      qrUrl: cert.qrUrl,
      emitidoPorId: cert.emitidoPorId,
      estado: cert.estado,
      curso: cert.curso,
      instructor: cert.instructor,
      participante: inscripcion?.participante ?? null,
      programacion: inscripcion?.programacion ?? null,
      estadoVigencia: this.calcularEstadoVigencia(cert.vigenciaHasta, cert.estado),
    };
  }

  private async generarPdf(
    cert: { codigo: string; emitidoEn: Date; vigenciaHasta: Date },
    programacion: {
      curso: { nombre: string; descripcion?: string | null; duracionHoras?: number | null; modalidad?: string | null };
      instructor?: { nombre: string; apellido?: string | null } | null;
      fechaInicio: Date;
      lugar?: string | null;
    },
    participante: { nombre: string; ci: string; email?: string | null },
  ) {
    return this.pdfService.generarCertificadoCapacitacion({
      codigoCertificado: cert.codigo,
      participante: {
        nombre: participante.nombre,
        ci: participante.ci,
        email: participante.email ?? undefined,
      },
      curso: {
        nombre: programacion.curso.nombre,
        descripcion: programacion.curso.descripcion ?? undefined,
        duracionHoras: programacion.curso.duracionHoras ?? undefined,
        modalidad: programacion.curso.modalidad ?? undefined,
      },
      programacion: {
        fechaInicio: programacion.fechaInicio,
        lugar: programacion.lugar,
      },
      instructor: programacion.instructor
        ? {
            nombre: programacion.instructor.nombre,
            apellido: programacion.instructor.apellido,
          }
        : undefined,
      fechaEmision: cert.emitidoEn,
      fechaVigencia: cert.vigenciaHasta,
    });
  }
}
