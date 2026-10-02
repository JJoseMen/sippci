import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoParticipante } from '@prisma/client';
import { existsSync } from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearParticipanteDto } from './dto/crear-participante.dto';
import { QueryParticipanteDto } from './dto/query-participante.dto';

export type ParticipanteCompleto = {
  id: number;
  subCodigo: string;
  nombreCompleto: string;
  carnet: string;
  expedido: string;
  email: string | null;
  telefono: string | null;
  esRepresentante: boolean;
  estado: EstadoParticipante;
  observacion: string | null;
  pdfFormularioRuta: string | null;
  pdfFormularioHash: string | null;
  pdfCertificadoRuta: string | null;
  pdfCertificadoHash: string | null;
  codigoCertificado: string | null;
  fechaEmisionCert: Date | null;
  instructor: string | null;
  calificacion: string | null;
  solicitud: { id: number; codigoFormulario: string; usuarioId: number } | null;
  relaciones: { curso: { nombre: string; costoBsf: unknown } }[];
};

@Injectable()
export class CapacitacionesService {
  constructor(private prisma: PrismaService) {}

  async listarCursos() {
    return this.prisma.cursos.findMany({ where: { activo: true } });
  }

  async agregarParticipante(
    codigoSolicitud: string, dto: CrearParticipanteDto, usuarioId: number,
  ) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigoSolicitud },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.usuarioId !== usuarioId)
      throw new ForbiddenException('No es tu solicitud');
    if (sol.estado !== 'BORRADOR')
      throw new BadRequestException('Solo se pueden agregar participantes en BORRADOR');

    const cursoRecords = await this.prisma.cursos.findMany({
      where: { nombre: { in: dto.cursos }, activo: true },
    });
    if (cursoRecords.length !== dto.cursos.length) {
      throw new BadRequestException('Algunos cursos no son validos');
    }

    const participante = await this.prisma.participantes_capacitacion.create({
      data: {
        solicitudId: sol.id,
        nombre: dto.nombreCompleto,
        ci: dto.carnet,
        email: dto.email,
        telefono: dto.telefono,
      },
    });

    for (const curso of cursoRecords) {
      await this.prisma.participantes_cursos.create({
        data: {
          participanteId: participante.id,
          cursoId: curso.id,
        },
      });
    }
    return participante;
  }

  async validarCapacitacion(codigoSolicitud: string, usuarioId?: number) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigoSolicitud },
      include: { usuario: true },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.tipoTramite !== 'CAPACITACION')
      throw new BadRequestException('No es una solicitud de capacitacion');
    if (usuarioId !== undefined && sol.usuarioId !== usuarioId)
      throw new ForbiddenException('No es tu solicitud');
    return sol;
  }

  async listarParticipantes(codigoSolicitud: string, query: QueryParticipanteDto) {
    const sol = await this.validarCapacitacion(codigoSolicitud);
    const where: Record<string, unknown> = { solicitudId: sol.id };
    if (query.search) {
      where.OR = [
        { nombreCompleto: { contains: query.search, mode: 'insensitive' } },
        { carnet: { contains: query.search, mode: 'insensitive' } },
        { subCodigo: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.estado) where.estado = query.estado;
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const [items, total] = await Promise.all([
      this.prisma.participantes_capacitacion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { relaciones: { include: { curso: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.participantes_capacitacion.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async calcularCostoTotal(codigoSolicitud: string) {
    const sol = await this.validarCapacitacion(codigoSolicitud);
    const participantes = await this.prisma.participantes_capacitacion.findMany({
      where: { solicitudId: sol.id },
      include: { relaciones: { include: { curso: true } } },
    });
    let total = 0;
    for (const p of participantes) {
      for (const r of p.relaciones) total += Number(r.curso.costoBsf ?? 0);
    }
    return { total, participantes: participantes.length };
  }

  async eliminarParticipante(id: number, usuarioId: number) {
    const part = await this.prisma.participantes_capacitacion.findUnique({
      where: { id },
      include: { solicitud: true },
    });
    if (!part) throw new NotFoundException('Participante no encontrado');
    if (part.solicitud?.usuarioId !== usuarioId)
      throw new ForbiddenException('No es tu solicitud');
    if (part.solicitud?.estado !== 'BORRADOR')
      throw new BadRequestException('Solo se pueden eliminar en BORRADOR');
    await this.prisma.participantes_cursos.deleteMany({ where: { participanteId: id } });
    await this.prisma.participantes_capacitacion.delete({ where: { id } });
    return { message: 'Participante eliminado' };
  }

  async conCursosPorSubCodigo(subCodigo: string): Promise<ParticipanteCompleto> {
    const p = await this.prisma.participantes_capacitacion.findUnique({
      where: { subCodigo },
      include: {
        solicitud: { select: { id: true, codigoFormulario: true, usuarioId: true } },
        relaciones: { include: { curso: true } },
      },
    });
    if (!p) throw new NotFoundException('Participante no encontrado');
    return p as unknown as ParticipanteCompleto;
  }

  async descargarFormulario(subCodigo: string) {
    const p = await this.conCursosPorSubCodigo(subCodigo);
    if (!p.pdfFormularioRuta || !existsSync(p.pdfFormularioRuta))
      throw new NotFoundException('Formulario no generado');
    return {
      ruta: p.pdfFormularioRuta,
      nombre: `${p.subCodigo}_FORM.pdf`,
      mime: 'application/pdf',
    };
  }

  async obtenerCursosDeDatos(datos: unknown): Promise<string[]> {
    const d = (datos ?? {}) as Record<string, unknown>;
    if (Array.isArray(d.cursos) && d.cursos.length) return d.cursos as string[];
    return String(d.cursosTexto ?? '')
      .split(/[,;]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  }
}