import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';
import { QueryNotificacionDto } from './dto/query-notificacion.dto';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CrearNotificacionDto) {
    return this.prisma.notificaciones.create({
      data: {
        usuarioId: dto.usuarioId,
        solicitudId: dto.solicitudId,
        tipo: dto.tipo as any,
        asunto: dto.titulo,
        mensaje: dto.mensaje,
      },
    });
  }

  async crearNotificacionParticipante(datos: {
    usuarioId: number;
    solicitudId: number;
    tipo: 'PARTICIPANTE_APROBADO' | 'PARTICIPANTE_RECHAZADO' | 'CERTIFICADO_EMITIDO';
    titulo: string;
    mensaje: string;
  }) {
    return this.prisma.notificaciones.create({
      data: {
        usuarioId: datos.usuarioId,
        solicitudId: datos.solicitudId,
        tipo: datos.tipo as any,
        asunto: datos.titulo,
        mensaje: datos.mensaje,
      },
    });
  }

  async findAll(usuarioId: number, query: QueryNotificacionDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const where: Record<string, unknown> = { usuarioId };

    if (query.leida !== undefined) where.leida = query.leida === 'true';
    if (query.tipo) where.tipo = query.tipo;

    const [items, total] = await Promise.all([
      this.prisma.notificaciones.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { solicitud: { select: { id: true, codigoFormulario: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificaciones.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async marcarLeida(id: number, usuarioId: number) {
    const notif = await this.prisma.notificaciones.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException(`Notificacion ${id} no encontrada`);
    if (notif.usuarioId !== usuarioId)
      throw new ForbiddenException('No es tu notificacion');

    return this.prisma.notificaciones.update({
      where: { id },
      data: { leida: true },
    });
  }

  async marcarTodasLeidas(usuarioId: number) {
    const result = await this.prisma.notificaciones.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
    return { count: result.count };
  }

  async generarNotificacionVencimiento(solicitudId: number) {
    const sol = await this.prisma.solicitudes.findUnique({ where: { id: solicitudId } });
    if (!sol || !sol.fechaVigencia) return null;

    const hoy = new Date();
    const diff = sol.fechaVigencia.getTime() - hoy.getTime();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (dias > 30 || dias < 0) return null;

    return this.prisma.notificaciones.create({
      data: {
        usuarioId: sol.usuarioId,
        solicitudId: sol.id,
        tipo: 'SISTEMA',
        asunto: 'Certificado proximo a vencer',
        mensaje: `Su certificado de la solicitud ${sol.codigoFormulario} vence en ${dias} dias.`,
      },
    });
  }
}
