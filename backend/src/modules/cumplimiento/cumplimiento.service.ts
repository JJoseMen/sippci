import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificadosPdfService } from '../certificados/certificados-pdf.service';
import { QueryCumplimientoDto } from './dto/query-cumplimiento.dto';
import { ProgramarInspeccionDto } from './dto/programar-inspeccion.dto';
import { RegistrarInformeDto } from './dto/registrar-informe.dto';
import { EmitirCertificadoCumplimientoDto } from './dto/accion-cumplimiento.dto';
import { SolicitudStateMachine } from '../solicitudes/state-machine/solicitud.state-machine';
import * as fs from 'fs';
import * as path from 'path';

type TipoCumplimiento = 'NATURAL' | 'JURIDICA';

const TIPO_TRAMITE = 'CERTIFICACION_SIPPCI';
const TIPO_CERTIFICADO = 'SIPPCI';
const VIGENCIA_ANIOS = 2;

@Injectable()
export class CumplimientoService {
  constructor(
    private prisma: PrismaService,
    private pdfService: CertificadosPdfService,
  ) {}

  // ============================================================
  // SOLICITUDES
  // ============================================================

  async findSolicitudes(tipo: TipoCumplimiento, query: QueryCumplimientoDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {
      tipoTramite: TIPO_TRAMITE,
      subtipoTramite: tipo,
    };

    if (query.estado) where.estado = query.estado;

    if (query.nivelRiesgo) {
      where.datosJson = { path: ['nivelRiesgo'], equals: query.nivelRiesgo };
    }

    if (query.search) {
      where.OR = [
        { codigoFormulario: { contains: query.search, mode: 'insensitive' } },
        { usuario: { nombre: { contains: query.search, mode: 'insensitive' } } },
        { empresa: { razonSocial: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.fechaDesde || query.fechaHasta) {
      where.createdAt = {};
      if (query.fechaDesde) {
        (where.createdAt as Record<string, unknown>).gte = new Date(query.fechaDesde);
      }
      if (query.fechaHasta) {
        (where.createdAt as Record<string, unknown>).lte = new Date(
          query.fechaHasta + 'T23:59:59Z',
        );
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.solicitudes.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
          empresa: { select: { id: true, razonSocial: true, nit: true } },
          documentos: { select: { id: true, nombreOriginal: true, estado: true, tipo: true } },
          certificados: { select: { id: true, codigoCertificado: true, fechaVigencia: true } },
          inspecciones: {
            select: {
              id: true,
              estado: true,
              resultado: true,
              fechaProgramada: true,
              fechaRealizada: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.solicitudes.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOneSolicitud(codigo: string, tipo: TipoCumplimiento) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: {
        codigoFormulario: codigo,
        tipoTramite: TIPO_TRAMITE,
        subtipoTramite: tipo,
      },
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true, telefono: true },
        },
        empresa: true,
        documentos: { orderBy: { createdAt: 'desc' } },
        pagos: true,
        certificados: true,
        inspecciones: {
          include: {
            inspector: { select: { id: true, nombre: true, apellido: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        historial: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!sol) {
      throw new NotFoundException(
        `Solicitud ${codigo} no encontrada para tipo ${tipo}`,
      );
    }

    return sol;
  }

  // ============================================================
  // ACCIONES
  // ============================================================

  async aprobar(codigo: string, userId: number) {
    const sol = await this.getSolicitudValidada(codigo);

    this.validarTransicion(sol.estado, 'APROBADA');

    const actualizada = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: { estado: 'APROBADA', fechaAprobacion: new Date() },
    });

    await this.registrarHistorial(
      sol.id,
      sol.estado,
      'APROBADA',
      'Solicitud aprobada',
      userId,
    );

    return actualizada;
  }

  async observar(codigo: string, justificacion: string, userId: number) {
    if (!justificacion || justificacion.trim().length < 10) {
      throw new BadRequestException(
        'La justificación es obligatoria (mínimo 10 caracteres)',
      );
    }

    const sol = await this.getSolicitudValidada(codigo);
    this.validarTransicion(sol.estado, 'OBSERVADA');

    const actualizada = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: { estado: 'OBSERVADA' },
    });

    await this.registrarHistorial(
      sol.id,
      sol.estado,
      'OBSERVADA',
      justificacion,
      userId,
    );

    return actualizada;
  }

  async rechazar(codigo: string, justificacion: string, userId: number) {
    if (!justificacion || justificacion.trim().length < 10) {
      throw new BadRequestException(
        'La justificación es obligatoria (mínimo 10 caracteres)',
      );
    }

    const sol = await this.getSolicitudValidada(codigo);
    this.validarTransicion(sol.estado, 'RECHAZADA');

    const actualizada = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: { estado: 'RECHAZADA' },
    });

    await this.registrarHistorial(
      sol.id,
      sol.estado,
      'RECHAZADA',
      justificacion,
      userId,
    );

    return actualizada;
  }

  // ============================================================
  // INSPECCIONES
  // ============================================================

  async programarInspeccion(
    codigo: string,
    dto: ProgramarInspeccionDto,
    userId: number,
  ) {
    const sol = await this.getSolicitudValidada(codigo);

    this.validarTransicion(sol.estado, 'INSPECCION_PROGRAMADA');

    const inspectorId = dto.inspectorId ?? userId;

    const inspeccion = await this.prisma.$transaction(async (tx) => {
      const insp = await tx.inspecciones.create({
        data: {
          solicitudId: sol.id,
          inspectorId,
          fechaProgramada: new Date(dto.fechaProgramada),
          estado: 'PROGRAMADA',
          observaciones: dto.observaciones,
          creadoPorId: userId,
        },
      });

      await tx.solicitudes.update({
        where: { id: sol.id },
        data: { estado: 'INSPECCION_PROGRAMADA' },
      });

      await tx.historial_solicitudes.create({
        data: {
          solicitudId: sol.id,
          estadoAnterior: sol.estado,
          estadoNuevo: 'INSPECCION_PROGRAMADA',
          comentario: `Inspección programada para ${dto.fechaProgramada}${
            dto.observaciones ? ` — ${dto.observaciones}` : ''
          }`,
          realizadoPorId: userId,
        },
      });

      return insp;
    });

    return inspeccion;
  }

  async listarInspecciones(query: QueryCumplimientoDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {
      solicitud: { tipoTramite: TIPO_TRAMITE },
    };

    if (query.estado) where.estado = query.estado;

    if (query.nivelRiesgo) {
      where.solicitud = {
        ...(where.solicitud as Record<string, unknown>),
        datosJson: { path: ['nivelRiesgo'], equals: query.nivelRiesgo },
      };
    }

    if (query.search) {
      where.OR = [
        { solicitud: { codigoFormulario: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.inspecciones.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          solicitud: {
            select: {
              id: true,
              codigoFormulario: true,
              subtipoTramite: true,
              estado: true,
              usuario: { select: { nombre: true, apellido: true } },
              empresa: { select: { razonSocial: true } },
            },
          },
          inspector: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inspecciones.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOneInspeccion(id: number) {
    const insp = await this.prisma.inspecciones.findUnique({
      where: { id },
      include: {
        solicitud: {
          include: {
            usuario: { select: { nombre: true, apellido: true, email: true, telefono: true } },
            empresa: true,
          },
        },
        inspector: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    });

    if (!insp) {
      throw new NotFoundException(`Inspección ${id} no encontrada`);
    }

    return insp;
  }

  async registrarInforme(
    id: number,
    dto: RegistrarInformeDto,
    userId: number,
  ) {
    const insp = await this.prisma.inspecciones.findUnique({
      where: { id },
      include: { solicitud: true },
    });

    if (!insp) {
      throw new NotFoundException(`Inspección ${id} no encontrada`);
    }

    if (insp.solicitud.estado !== 'INSPECCION_PROGRAMADA') {
      throw new BadRequestException(
        `Solo se puede registrar informe si la solicitud está en INSPECCION_PROGRAMADA. Estado actual: ${insp.solicitud.estado}`,
      );
    }

    // Mapear resultado al estado de inspección
    const estadoInspeccion =
      dto.resultado === 'APTO'
        ? 'CONFORME'
        : dto.resultado === 'NO_APTO'
          ? 'NO_CONFORME'
          : 'EN_CURSO';

    const nuevoEstadoSolicitud =
      dto.resultado === 'APTO' ? 'INFORME_REGISTRADO' : 'OBSERVADA';

    const result = await this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.inspecciones.update({
        where: { id },
        data: {
          estado: estadoInspeccion,
          resultado: dto.resultado,
          observaciones: dto.observaciones,
          informeRuta: dto.informeRuta,
          fechaRealizada: new Date(),
        },
      });

      await tx.solicitudes.update({
        where: { id: insp.solicitudId },
        data: { estado: nuevoEstadoSolicitud },
      });

      await tx.historial_solicitudes.create({
        data: {
          solicitudId: insp.solicitudId,
          estadoAnterior: insp.solicitud.estado,
          estadoNuevo: nuevoEstadoSolicitud,
          comentario: `Informe registrado: ${dto.resultado} — ${dto.observaciones}`,
          realizadoPorId: userId,
        },
      });

      return actualizada;
    });

    return result;
  }

  // ============================================================
  // CERTIFICADOS
  // ============================================================

  async emitirCertificado(
    codigo: string,
    dto: EmitirCertificadoCumplimientoDto,
    userId: number,
  ) {
    const sol = await this.getSolicitudValidada(codigo);

    this.validarTransicion(sol.estado, 'CERTIFICADO_EMITIDO');

    const existente = await this.prisma.certificados.findFirst({
      where: { solicitudId: sol.id, activo: true },
    });

    if (existente) {
      throw new BadRequestException(
        `La solicitud ya tiene un certificado activo: ${existente.codigoCertificado}`,
      );
    }

    const codigoCertificado = await this.generarCodigoCertificado();
    const fechaEmision = new Date();
    const fechaVigencia = new Date(fechaEmision);
    fechaVigencia.setFullYear(fechaVigencia.getFullYear() + VIGENCIA_ANIOS);

    const certificado = await this.prisma.$transaction(async (tx) => {
      const cert = await tx.certificados.create({
        data: {
          solicitudId: sol.id,
          tipo: TIPO_CERTIFICADO as any,
          codigoCertificado,
          emitidoPorId: userId,
          fechaEmision,
          fechaVigencia,
          activo: true,
          observaciones: dto.observaciones,
        },
      });

      await tx.solicitudes.update({
        where: { id: sol.id },
        data: {
          estado: 'CERTIFICADO_EMITIDO',
          fechaVigencia,
        },
      });

      await tx.historial_solicitudes.create({
        data: {
          solicitudId: sol.id,
          estadoAnterior: sol.estado,
          estadoNuevo: 'CERTIFICADO_EMITIDO',
          comentario: `Certificado emitido: ${codigoCertificado}${
            dto.observaciones ? ` — ${dto.observaciones}` : ''
          }`,
          realizadoPorId: userId,
        },
      });

      return cert;
    });

    // Generar PDF (async, no bloqueante)
    let rutaArchivo = `uploads/certificados/${codigoCertificado}.pdf`;
    let qrBase64 = '';
    try {
      const solCompleta = await this.prisma.solicitudes.findUnique({
        where: { id: sol.id },
        include: {
          usuario: { select: { nombre: true, apellido: true } },
          empresa: { select: { razonSocial: true, nit: true } },
        },
      });

      const datosJson = (solCompleta?.datosJson as Record<string, unknown>) || {};
      const isJuridica = sol.subtipoTramite === 'JURIDICA';

      const result = await this.pdfService.generarCertificadoProfesional({
        codigoCertificado,
        tipo: isJuridica ? 'JURIDICA' : 'NATURAL',
        titular: {
          nombre: solCompleta?.usuario
            ? `${solCompleta.usuario.nombre} ${solCompleta.usuario.apellido ?? ''}`.trim()
            : (datosJson.nombreCompleto as string),
          razonSocial:
            solCompleta?.empresa?.razonSocial || (datosJson.razonSocial as string),
          ci: datosJson.ci as string,
          nit: solCompleta?.empresa?.nit || (datosJson.nit as string),
        },
        detalle: {
          nombreEstablecimiento: datosJson.nombreEstablecimiento as string,
          direccion: datosJson.direccion as string,
          nivelRiesgo: datosJson.nivelRiesgo as string,
          actividadEconomica: datosJson.actividadEconomica as string,
          ...datosJson,
        },
        fechaEmision,
        fechaVigencia,
      });

      rutaArchivo = result.rutaArchivo;
      qrBase64 = result.qrBase64;
    } catch (err) {
      console.warn('Error generando PDF certificado cumplimiento:', err);
    }

    return { ...certificado, rutaArchivo, qrBase64 };
  }

  async listarCertificados(query: QueryCumplimientoDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {
      activo: true,
      tipo: TIPO_CERTIFICADO,
      solicitud: { tipoTramite: TIPO_TRAMITE },
    };

    if (query.search) {
      where.OR = [
        { codigoCertificado: { contains: query.search, mode: 'insensitive' } },
        { solicitud: { codigoFormulario: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.certificados.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          solicitud: {
            include: {
              usuario: { select: { id: true, nombre: true, apellido: true } },
              empresa: { select: { id: true, razonSocial: true, nit: true } },
            },
          },
          emitidoPor: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaEmision: 'desc' },
      }),
      this.prisma.certificados.count({ where }),
    ]);

    const itemsConEstado = items.map((c) => ({
      ...c,
      estadoVigencia: this.calcularEstadoVigencia(c.fechaVigencia),
    }));

    return {
      items: itemsConEstado,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async obtenerRutaPdf(codigoCertificado: string): Promise<string> {
    const cert = await this.prisma.certificados.findFirst({
      where: { codigoCertificado, tipo: TIPO_CERTIFICADO },
      include: {
        solicitud: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            empresa: { select: { razonSocial: true, nit: true } },
          },
        },
      },
    });

    if (!cert) throw new NotFoundException('Certificado no encontrado');

    const ruta = path.join(
      process.cwd(),
      'uploads',
      'certificados',
      `${codigoCertificado}.pdf`,
    );

    if (fs.existsSync(ruta)) return ruta;

    // Self-healing: regenerar
    const sol = cert.solicitud;
    const datosJson = (sol.datosJson as Record<string, unknown>) || {};
    const isJuridica = sol.subtipoTramite === 'JURIDICA';

    await this.pdfService.generarCertificadoProfesional({
      codigoCertificado: cert.codigoCertificado,
      tipo: isJuridica ? 'JURIDICA' : 'NATURAL',
      titular: {
        nombre: sol.usuario
          ? `${sol.usuario.nombre} ${sol.usuario.apellido ?? ''}`.trim()
          : (datosJson.nombreCompleto as string),
        razonSocial: sol.empresa?.razonSocial || (datosJson.razonSocial as string),
        ci: datosJson.ci as string,
        nit: sol.empresa?.nit || (datosJson.nit as string),
      },
      detalle: {
        nombreEstablecimiento: datosJson.nombreEstablecimiento as string,
        direccion: datosJson.direccion as string,
        nivelRiesgo: datosJson.nivelRiesgo as string,
        ...datosJson,
      },
      fechaEmision: cert.fechaEmision,
      fechaVigencia: cert.fechaVigencia,
    });

    if (!fs.existsSync(ruta)) throw new NotFoundException('No se pudo regenerar el PDF');
    return ruta;
  }

  // ============================================================
  // REPORTES
  // ============================================================

  async reporteSolicitudesPorEstado() {
    const result = await this.prisma.solicitudes.groupBy({
      by: ['estado'],
      where: { tipoTramite: TIPO_TRAMITE },
      _count: { estado: true },
    });

    return result.map((r) => ({
      estado: r.estado,
      total: r._count.estado,
    }));
  }

  async reportePorNivelRiesgo() {
    const solicitudes = await this.prisma.solicitudes.findMany({
      where: { tipoTramite: TIPO_TRAMITE },
      select: { datosJson: true },
    });

    const porRiesgo: Record<string, number> = {};
    for (const s of solicitudes) {
      const data = s.datosJson as Record<string, unknown> | null;
      const nivel = (data?.nivelRiesgo as string) || 'SIN_ESPECIFICAR';
      porRiesgo[nivel] = (porRiesgo[nivel] || 0) + 1;
    }

    return Object.entries(porRiesgo)
      .map(([nivel, total]) => ({ nivel, total }))
      .sort((a, b) => b.total - a.total);
  }

  async reporteCertificadosPorMes() {
    const certificados = await this.prisma.certificados.findMany({
      where: {
        activo: true,
        tipo: TIPO_CERTIFICADO,
        solicitud: { tipoTramite: TIPO_TRAMITE },
      },
      select: { fechaEmision: true },
    });

    const porMes: Record<string, number> = {};
    for (const c of certificados) {
      const key = `${c.fechaEmision.getFullYear()}-${String(
        c.fechaEmision.getMonth() + 1,
      ).padStart(2, '0')}`;
      porMes[key] = (porMes[key] || 0) + 1;
    }

    return Object.entries(porMes)
      .map(([mes, total]) => ({ mes, total }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }

  // ============================================================
  // HELPERS PRIVADOS
  // ============================================================

  private async getSolicitudValidada(codigo: string) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: {
        codigoFormulario: codigo,
        tipoTramite: TIPO_TRAMITE,
      },
    });

    if (!sol) {
      throw new NotFoundException(`Solicitud ${codigo} no encontrada`);
    }

    return sol;
  }

  private validarTransicion(estadoActual: EstadoSolicitud, estadoNuevo: EstadoSolicitud) {
    const permitidos = SolicitudStateMachine.obtenerEstadosPermitidos(estadoActual);

    if (!permitidos.includes(estadoNuevo)) {
      throw new ForbiddenException(
        `Transición no permitida: ${estadoActual} → ${estadoNuevo}. Permitidos: ${permitidos.join(', ')}`,
      );
    }
  }

  private async registrarHistorial(
    solicitudId: number,
    estadoAnterior: EstadoSolicitud | null,
    estadoNuevo: EstadoSolicitud,
    comentario: string,
    userId: number,
  ) {
    await this.prisma.historial_solicitudes.create({
      data: {
        solicitudId,
        estadoAnterior,
        estadoNuevo,
        comentario,
        realizadoPorId: userId,
      },
    });
  }

  private calcularEstadoVigencia(fechaVigencia: Date | null): string {
    if (!fechaVigencia) return 'SIN_VIGENCIA';

    const hoy = new Date();
    const diffMs = fechaVigencia.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return 'VENCIDO';
    if (diffDias < 180) return 'POR_VENCER';
    return 'VIGENTE';
  }

  private async generarCodigoCertificado(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.certificados.count({
      where: {
        codigoCertificado: { startsWith: `CERT-SIPPCI-${year}-` },
      },
    });
    const numero = String(count + 1).padStart(4, '0');
    return `CERT-SIPPCI-${year}-${numero}`;
  }
}
