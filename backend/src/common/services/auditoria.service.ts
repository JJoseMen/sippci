import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type RegistrarAuditoria = {
  usuarioInternoId: number;
  accion: string;
  entidad?: string;
  entidadId?: number;
  detalle?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  async registrar(datos: RegistrarAuditoria) {
    return this.prisma.auditoria_general.create({
      data: {
        usuarioInternoId: datos.usuarioInternoId,
        accion: datos.accion,
        entidad: datos.entidad,
        entidadId: datos.entidadId,
        detalle: (datos.detalle as any) ?? undefined,
        ip: datos.ip,
        userAgent: datos.userAgent,
      },
    });
  }
}