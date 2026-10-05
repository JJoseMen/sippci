import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoSolicitud, TipoCertificado } from '@prisma/client';
import { calcularVencimiento } from '../../common/utils/fecha.util';
import { QueryCertificadoDto } from './dto/query-certificado.dto';
import { RevisarSolicitudDto } from './dto/revisar-solicitud.dto';
import { AprobarSolicitudDto } from './dto/aprobar-solicitud.dto';
import { RegistrarCertificadoDto } from './dto/registrar-certificado.dto';

@Injectable()
export class CertificadosService {
  constructor(private prisma: PrismaService) {}

  async revisar(codigo: string, dto: RevisarSolicitudDto, usuarioId: number) {
    const sol = await this.findByCodigo(codigo);
    if (sol.estado !== EstadoSolicitud.EN_REVISION)
      throw new BadRequestException('La solicitud no esta en EN_REVISION');

    const updated = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: { estado: EstadoSolicitud.REVISADO },
    });
    await this.registrarHistorial(sol.id, EstadoSolicitud.EN_REVISION, EstadoSolicitud.REVISADO, dto.observacion, usuarioId);
    return updated;
  }

  async aprobar(codigo: string, dto: AprobarSolicitudDto, usuarioId: number) {
    const sol = await this.findByCodigo(codigo);
    if (sol.estado !== EstadoSolicitud.REVISADO)
      throw new BadRequestException('La solicitud no esta en REVISADO');

    const now = new Date();
    const updated = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: {
        estado: EstadoSolicitud.APROBADA,
        fechaAprobacion: now,
        fechaVigencia: calcularVencimiento(now),
      },
    });
    await this.registrarHistorial(sol.id, EstadoSolicitud.REVISADO, EstadoSolicitud.APROBADA, dto.observacion, usuarioId);
    return updated;
  }

  async registrarCertificado(codigo: string, dto: RegistrarCertificadoDto, usuarioId: number) {
    const sol = await this.findByCodigo(codigo);
    if (sol.estado !== EstadoSolicitud.APROBADA)
      throw new BadRequestException('La solicitud no esta en APROBADA');

    const existe = await this.prisma.certificados.findUnique({
      where: { codigoCertificado: dto.codigoCertificado },
    });
    if (existe)
      throw new BadRequestException(`El codigo ${dto.codigoCertificado} ya esta registrado`);

    const tipoMap: Record<string, TipoCertificado> = {
      CERTIFICACION_SIPPCI: TipoCertificado.SIPPCI,
      REGISTRO_PROFESIONAL: TipoCertificado.PROFESIONAL,
      CAPACITACION: TipoCertificado.CAPACITACION,
      RENOVACION: TipoCertificado.RENOVACION,
    };

    await this.prisma.certificados.create({
      data: {
        solicitudId: sol.id,
        tipo: tipoMap[sol.tipoTramite] ?? TipoCertificado.SIPPCI,
        codigoCertificado: dto.codigoCertificado,
        emitidoPorId: usuarioId,
        fechaVigencia: sol.fechaVigencia ?? calcularVencimiento(new Date()),
        observaciones: dto.observaciones,
      },
    });

    const updated = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: { estado: EstadoSolicitud.CERTIFICADO_EMITIDO },
    });
    await this.registrarHistorial(sol.id, EstadoSolicitud.APROBADA, EstadoSolicitud.CERTIFICADO_EMITIDO, `Certificado: ${dto.codigoCertificado}`, usuarioId);
    return updated;
  }

  async findOne(codigo: string) {
    const sol = await this.findByCodigo(codigo);
    const cert = await this.prisma.certificados.findUnique({
      where: { solicitudId: sol.id },
    });
    return { solicitud: sol, certificado: cert };
  }

  async verificarPorCodigo(codigoCertificado: string) {
    const cert = await this.prisma.certificados.findUnique({
      where: { codigoCertificado },
      include: {
        solicitud: {
          select: {
            codigoFormulario: true, tipoTramite: true,
            subtipoTramite: true, estado: true,
            fechaAprobacion: true, fechaVigencia: true,
          },
        },
      },
    });
    if (!cert) throw new NotFoundException(`Certificado ${codigoCertificado} no encontrado`);
    return cert;
  }

  async findAll(query: QueryCertificadoDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { codigoCertificado: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.fechaDesde || query.fechaHasta) {
      where.fechaEmision = {};
      if (query.fechaDesde) (where.fechaEmision as any).gte = new Date(query.fechaDesde);
      if (query.fechaHasta) (where.fechaEmision as any).lte = new Date(query.fechaHasta);
    }
    const [items, total] = await Promise.all([
      this.prisma.certificados.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { solicitud: { select: { codigoFormulario: true, estado: true } } },
        orderBy: { fechaEmision: 'desc' },
      }),
      this.prisma.certificados.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async marcarEntregado(id: number, usuarioInternoId: number) {
    const interno = await this.prisma.usuarios_internos.findUnique({
      where: { id: usuarioInternoId },
    });
    if (!interno || !['CAJERO', 'ADMIN'].includes(interno.rol))
      throw new ForbiddenException('Solo cajero o admin pueden entregar');
    const cert = await this.prisma.certificados.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException(`Certificado ${id} no encontrado`);
    if (cert.fechaEntrega)
      throw new BadRequestException('El certificado ya fue entregado');
    return this.prisma.certificados.update({
      where: { id },
      data: { fechaEntrega: new Date(), entregadoPorId: usuarioInternoId },
    });
  }

  private async findByCodigo(codigo: string) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigo },
    });
    if (!sol) throw new NotFoundException(`Solicitud ${codigo} no encontrada`);
    return sol;
  }

  private async registrarHistorial(
    solicitudId: number, anterior: EstadoSolicitud,
    nuevo: EstadoSolicitud, comentario: string | undefined, usuarioId: number,
  ) {
    await this.prisma.historial_solicitudes.create({
      data: {
        solicitudId, estadoAnterior: anterior, estadoNuevo: nuevo,
        comentario, realizadoPorId: usuarioId,
      },
    });
  }
}
