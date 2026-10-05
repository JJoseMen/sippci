import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { QuerySolicitudDto } from './dto/query-solicitud.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { SolicitudStateMachine } from './state-machine/solicitud.state-machine';
import {
  generarCodigoFormulario,
} from '../../common/utils/codigo.util';
import { calcularVencimiento } from '../../common/utils/fecha.util';
import { EstadoSolicitud } from '@prisma/client';

@Injectable()
export class SolicitudesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSolicitudDto, usuarioId: number) {
    return this.prisma.solicitudes.create({
      data: {
        codigoFormulario: `BOR-${Date.now()}`,
        tipoTramite: dto.tipoTramite as any,
        subtipoTramite: dto.subtipoTramite as any,
        estado: EstadoSolicitud.BORRADOR,
        usuarioId,
        empresaId: dto.empresaId ? +dto.empresaId : undefined,
        datosJson: (dto.datosJson ?? {}) as any,
      },
    });
  }

  async findAll(query: QuerySolicitudDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { codigoFormulario: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.tipoTramite) where.tipoTramite = query.tipoTramite;
    if (query.estado) where.estado = query.estado;
    if (query.usuarioId) where.usuarioId = +query.usuarioId;

    const [items, total] = await Promise.all([
      this.prisma.solicitudes.findMany({
        where,
        skip,
        take: limit,
        include: {
          usuario: { select: { id: true, nombre: true, email: true } },
          empresa: { select: { id: true, razonSocial: true, nit: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.solicitudes.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(codigo: string) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigo },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
        empresa: true,
        documentos: true,
        pagos: true,
        certificados: true,
        declaracionesJuradas: true,
        participantesCapacitacion: {
          include: { relaciones: { include: { curso: true } } },
          orderBy: { createdAt: 'asc' },
        },
        historial: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!sol) throw new NotFoundException(`Solicitud ${codigo} no encontrada`);
    return sol;
  }

  async findMias(usuarioId: number) {
    return this.prisma.solicitudes.findMany({
      where: { usuarioId },
      include: {
        empresa: { select: { id: true, razonSocial: true } },
        documentos: { select: { id: true, tipo: true, nombreOriginal: true, estado: true } },
        pagos: { select: { id: true, numeroOperacion: true, monto: true, estado: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async enviar(codigo: string, usuarioId: number) {
    const sol = await this.findOne(codigo);
    // TAREA 7: reenvío tras OBSERVADA. VALIDADOS se conservan, RECHAZADOS → PENDIENTE.
    // Aplica a AMBOS subtipos (la lógica es por solicitud, sin distinción).
    if (
      sol.estado !== EstadoSolicitud.BORRADOR &&
      sol.estado !== EstadoSolicitud.OBSERVADA &&
      sol.estado !== EstadoSolicitud.ENVIADA
    ) {
      throw new BadRequestException(
        'Solo se pueden enviar/reenviar solicitudes en BORRADOR, OBSERVADA o ENVIADA',
      );
    }
    if (sol.usuarioId !== usuarioId) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('No es tu solicitud');
    }

    if (sol.estado === EstadoSolicitud.BORRADOR) {
      const datos = sol.datosJson as Record<string, unknown>;
      const tipoPersona = datos?.tipoPersona as string | undefined;
      const count = await this.prisma.solicitudes.count();
      const nuevoCodigo = generarCodigoFormulario(
        sol.tipoTramite,
        tipoPersona,
        count + 1,
      );
      const updated = await this.prisma.solicitudes.update({
        where: { id: sol.id },
        data: {
          codigoFormulario: nuevoCodigo,
          estado: EstadoSolicitud.EN_REVISION,
          fechaPresentacion: new Date(),
        },
      });
      await this.prisma.historial_solicitudes.create({
        data: {
          solicitudId: sol.id,
          estadoAnterior: EstadoSolicitud.BORRADOR,
          estadoNuevo: EstadoSolicitud.EN_REVISION,
          comentario: 'Solicitud enviada por el usuario',
          realizadoPorId: usuarioId,
        },
      });
      return updated;
    }

    // Reenvío: resetear solo RECHAZADOS → PENDIENTE, conservar VALIDADOS
    const reseteados = await this.resetearRechazados(sol.id);
    const updated = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: {
        estado: EstadoSolicitud.EN_REVISION,
        fechaPresentacion: new Date(),
      },
    });
    await this.prisma.historial_solicitudes.create({
      data: {
        solicitudId: sol.id,
        estadoAnterior: sol.estado,
        estadoNuevo: EstadoSolicitud.EN_REVISION,
        comentario: `Solicitud reenviada por el ciudadano (${reseteados} documento(s) corregido(s) a revisión; validados conservados)`,
        realizadoPorId: usuarioId,
      },
    });
    return updated;
  }

  /**
   * TAREA 7: VALIDADOS se conservan, RECHAZADOS vuelven a PENDIENTE.
   * Retorna cantidad reseteada. Notifica al último revisor interno si existe.
   */
  private async resetearRechazados(solicitudId: number): Promise<number> {
    const r = await this.prisma.documentos.updateMany({
      where: { solicitudId, estado: 'RECHAZADO' },
      data: { estado: 'PENDIENTE' },
    });
    return r.count;
  }

  async cambiarEstado(
    codigo: string,
    dto: CambiarEstadoDto,
    usuarioInternoId: number,
  ) {
    const sol = await this.findOne(codigo);
    const nuevoEstado = dto.estado as EstadoSolicitud;
    SolicitudStateMachine.validarTransicion(sol.estado, nuevoEstado);

    // TAREA 7 (vía PATCH OBSERVADA → ENVIADA): conservar VALIDADOS, resetear RECHAZADOS.
    let comentarioExtra = '';
    if (
      sol.estado === EstadoSolicitud.OBSERVADA &&
      nuevoEstado === EstadoSolicitud.ENVIADA
    ) {
      const n = await this.resetearRechazados(sol.id);
      comentarioExtra = ` (${n} documento(s) corregido(s) a revisión; validados conservados)`;
    }

    const data: Record<string, unknown> = { estado: nuevoEstado };
    if (nuevoEstado === EstadoSolicitud.APROBADA) {
      data.fechaAprobacion = new Date();
      data.fechaVigencia = calcularVencimiento(new Date());
    }

    const updated = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data,
    });

    await this.prisma.historial_solicitudes.create({
      data: {
        solicitudId: sol.id,
        estadoAnterior: sol.estado,
        estadoNuevo: nuevoEstado,
        comentario: `${dto.observacion ?? ''}${comentarioExtra}`,
        realizadoPorId: usuarioInternoId,
      },
    });

    return updated;
  }
}
