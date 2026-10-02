import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoParticipante } from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { AuditoriaService } from '../../common/services/auditoria.service';
import { PdfService } from './services/pdf.service';
import { CapacitacionesService, ParticipanteCompleto } from './capacitaciones.service';
import { RevisarParticipanteDto } from './dto/revisar-participante.dto';
import { generarCodigoCertificadoParticipante } from '../../common/utils/codigo.util';
import { calcularHashSha256 } from '../../common/utils/hash.util';

const CAP_DIR = join(process.cwd(), 'uploads', 'capacitaciones');

@Injectable()
export class RevisionCapacitacionesService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private capacitaciones: CapacitacionesService,
    private notificaciones: NotificacionesService,
    private auditoria: AuditoriaService,
  ) {}

  /**
   * calificacion es Float? en BD pero el DTO la trae como string ('APROBADO',
   * 'REPROBADO' o un número en texto). Se guarda el número cuando lo hay;
   * el veredicto ya queda registrado en `estado`.
   */
  private static aNumero(valor?: string): number | null {
    if (valor === undefined || valor === '') return null;
    const n = Number(valor);
    return Number.isNaN(n) ? null : n;
  }

  async aprobarParticipante(
    subCodigo: string,
    usuarioInternoId: number,
    dto: RevisarParticipanteDto = {},
  ) {
    const p = await this.capacitaciones.conCursosPorSubCodigo(subCodigo);
    if (p.estado === 'CERTIFICADO_EMITIDO')
      throw new BadRequestException('El participante ya fue certificado');
    const actualizado = await this.prisma.participantes_capacitacion.update({
      where: { id: p.id },
      data: {
        estado: EstadoParticipante.APROBADO,
        observacion: dto.observacion || null,
        instructor: dto.instructor || null,
        calificacion: RevisionCapacitacionesService.aNumero(dto.calificacion),
      },
    });
    if (p.solicitud?.usuarioId) {
      await this.notificaciones.crearNotificacionParticipante({
        usuarioId: p.solicitud.usuarioId,
        solicitudId: p.solicitud.id,
        tipo: 'PARTICIPANTE_APROBADO',
        titulo: 'Participante aprobado',
        mensaje: `El participante ${p.nombreCompleto} fue aprobado en la capacitacion.`,
      });
    }
    await this.auditoria.registrar({
      usuarioInternoId,
      accion: 'APROBAR_PARTICIPANTE',
      entidad: 'participantes_capacitacion',
      entidadId: p.id,
      detalle: { subCodigo, instructor: dto.instructor, calificacion: dto.calificacion },
    });
    return actualizado;
  }

  async rechazarParticipante(
    subCodigo: string,
    observacion: string,
    usuarioInternoId: number,
  ) {
    const p = await this.capacitaciones.conCursosPorSubCodigo(subCodigo);
    if (p.estado === 'CERTIFICADO_EMITIDO')
      throw new BadRequestException('El participante ya fue certificado');
    const actualizado = await this.prisma.participantes_capacitacion.update({
      where: { id: p.id },
      data: { estado: EstadoParticipante.RECHAZADO, observacion: observacion || null },
    });
    if (p.solicitud?.usuarioId) {
      await this.notificaciones.crearNotificacionParticipante({
        usuarioId: p.solicitud.usuarioId,
        solicitudId: p.solicitud.id,
        tipo: 'PARTICIPANTE_RECHAZADO',
        titulo: 'Participante rechazado',
        mensaje: `El participante ${p.nombreCompleto} fue rechazado en la capacitacion.`,
      });
    }
    await this.auditoria.registrar({
      usuarioInternoId,
      accion: 'RECHAZAR_PARTICIPANTE',
      entidad: 'participantes_capacitacion',
      entidadId: p.id,
      detalle: { subCodigo, observacion },
    });
    return actualizado;
  }

  async reprobarParticipante(
    subCodigo: string,
    observacion: string,
    usuarioInternoId: number,
    dto: RevisarParticipanteDto = {},
  ) {
    const p = await this.capacitaciones.conCursosPorSubCodigo(subCodigo);
    if (p.estado === 'CERTIFICADO_EMITIDO')
      throw new BadRequestException('El participante ya fue certificado');
    const actualizado = await this.prisma.participantes_capacitacion.update({
      where: { id: p.id },
      data: {
        estado: EstadoParticipante.REPROBADO,
        observacion: observacion || dto.observacion || null,
        instructor: dto.instructor || null,
        calificacion: RevisionCapacitacionesService.aNumero(dto.calificacion),
      },
    });
    await this.auditoria.registrar({
      usuarioInternoId,
      accion: 'REPROBAR_PARTICIPANTE',
      entidad: 'participantes_capacitacion',
      entidadId: p.id,
      detalle: { subCodigo, observacion, instructor: dto.instructor, calificacion: dto.calificacion },
    });
    return actualizado;
  }

  async aprobarTodos(codigoSolicitud: string, ui: number) {
    const sol = await this.capacitaciones.validarCapacitacion(codigoSolicitud);
    const parts = await this.prisma.participantes_capacitacion.findMany({
      where: { solicitudId: sol.id },
    });
    for (const p of parts) {
      if (p.subCodigo && p.estado !== 'RECHAZADO' && p.estado !== 'REPROBADO')
        await this.aprobarParticipante(p.subCodigo, ui);
    }
    await this.auditoria.registrar({
      usuarioInternoId: ui,
      accion: 'APROBAR_TODOS_PARTICIPANTES',
      entidad: 'solicitudes',
      entidadId: sol.id,
      detalle: { codigoSolicitud, participantes: parts.length },
    });
    return { message: 'Participantes aprobados' };
  }

  async emitirCertificados(codigoSolicitud: string, usuarioInternoId: number) {
    const sol = await this.capacitaciones.validarCapacitacion(codigoSolicitud);
    const interno = await this.prisma.usuarios_internos.findUnique({
      where: { id: usuarioInternoId },
    });
    const instructor = interno?.nombre ?? 'INSTRUCTOR DNB';
    const aprobados = await this.prisma.participantes_capacitacion.findMany({
      where: { solicitudId: sol.id, estado: 'APROBADO' },
      include: { relaciones: { include: { curso: true } } },
    });
    const emitidos: string[] = [];
    for (let i = 0; i < aprobados.length; i++) {
      const p = aprobados[i] as unknown as ParticipanteCompleto;
      const seq = await this.prisma.participantes_capacitacion.count();
      const codigoCert = generarCodigoCertificadoParticipante(seq + 1 + i);
      const buffer = await this.pdfService.generarCertificado({
        codigoCertificado: codigoCert,
        subCodigo: p.subCodigo,
        nombreCompleto: p.nombreCompleto,
        carnet: p.carnet,
        fechaEmision: new Date(),
        instructor: p.instructor ?? instructor,
        calificacion: p.calificacion ?? 'APTO',
        cursos: p.relaciones.map((r) => r.curso.nombre),
        solicitudCodigo: sol.codigoFormulario,
      });
      if (!existsSync(CAP_DIR)) await mkdir(CAP_DIR, { recursive: true });
      const ruta = join(CAP_DIR, `${codigoCert}.pdf`);
      await writeFile(ruta, buffer);
      await this.prisma.participantes_capacitacion.update({
        where: { id: p.id },
        data: {
          codigoCertificado: codigoCert,
          pdfCertificadoRuta: ruta,
          pdfCertificadoHash: calcularHashSha256(buffer),
          fechaEmisionCert: new Date(),
          estado: EstadoParticipante.CERTIFICADO_EMITIDO,
        },
      });
      emitidos.push(codigoCert);
    }
    if (emitidos.length > 0) {
      await this.notificaciones.crearNotificacionParticipante({
        usuarioId: sol.usuarioId,
        solicitudId: sol.id,
        tipo: 'CERTIFICADO_EMITIDO',
        titulo: 'Certificados emitidos',
        mensaje: `Se emitieron ${emitidos.length} certificado(s) para la solicitud ${sol.codigoFormulario}.`,
      });
    }
    await this.auditoria.registrar({
      usuarioInternoId,
      accion: 'EMITIR_CERTIFICADOS',
      entidad: 'solicitudes',
      entidadId: sol.id,
      detalle: { codigoSolicitud, emitidos: emitidos.length, codigos: emitidos },
    });
    return { emitidos: emitidos.length, codigos: emitidos };
  }

  async descargarCertificado(subCodigo: string) {
    const p = await this.capacitaciones.conCursosPorSubCodigo(subCodigo);
    if (!p.pdfCertificadoRuta || !p.codigoCertificado)
      throw new NotFoundException('Certificado no emitido');
    if (!existsSync(p.pdfCertificadoRuta))
      throw new NotFoundException('Certificado no encontrado en storage');
    return {
      ruta: p.pdfCertificadoRuta,
      nombre: `${p.codigoCertificado}.pdf`,
      mime: 'application/pdf',
    };
  }

  async verificarCertificado(codigoCertificado: string) {
    const p = await this.prisma.participantes_capacitacion.findUnique({
      where: { codigoCertificado },
      include: {
        solicitud: { select: { codigoFormulario: true } },
        relaciones: { include: { curso: true } },
      },
    });
    if (!p || p.estado !== 'CERTIFICADO_EMITIDO')
      throw new NotFoundException('Certificado no valido');
    return {
      valido: true,
      codigoCertificado: p.codigoCertificado,
      nombreCompleto: p.nombreCompleto,
      carnet: p.carnet,
      fechaEmision: p.fechaEmisionCert,
      cursos: p.relaciones.map((r) => r.curso.nombre),
      solicitudCodigo: p.solicitud?.codigoFormulario,
    };
  }
}