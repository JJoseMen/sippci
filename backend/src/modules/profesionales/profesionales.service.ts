import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryProfesionalesDto } from './dto/query-profesionales.dto';
import { EmitirCertificadoDto } from './dto/emitir-certificado.dto';
import { ProfesionalesStateMachine as SolicitudStateMachine } from './state-machine/profesionales.state-machine';
import { EstadoSolicitud, TipoCertificado } from '@prisma/client';
import { CertificadosPdfService } from '../certificados/certificados-pdf.service';
import * as fs from 'fs';
import * as path from 'path';

type TipoProfesional = 'NATURAL' | 'JURIDICA';

@Injectable()
export class ProfesionalesService {
  constructor(
    private prisma: PrismaService,
    private pdfService: CertificadosPdfService,
  ) {}

  // ============================================================
  // SOLICITUDES
  // ============================================================

  async findSolicitudes(tipo: TipoProfesional, query: QueryProfesionalesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {
      tipoTramite: 'REGISTRO_PROFESIONAL',
      subtipoTramite: tipo,
    };

    if (query.estado) where.estado = query.estado;

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
          usuario: { select: { id: true, nombre: true, email: true } },
          empresa: { select: { id: true, razonSocial: true, nit: true } },
          documentos: { select: { id: true, nombreOriginal: true, estado: true } },
          certificados: { select: { id: true, codigoCertificado: true, fechaVigencia: true } },
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

  async findOneSolicitud(codigo: string, tipo: TipoProfesional) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: {
        codigoFormulario: codigo,
        tipoTramite: 'REGISTRO_PROFESIONAL',
        subtipoTramite: tipo as any,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
        empresa: true,
        documentos: { orderBy: { createdAt: 'desc' } },
        pagos: true,
        certificados: true,
        historial: {
          orderBy: { createdAt: 'desc' },
        },
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

    this.validarTransicion(sol.estado as string, 'APROBADA');

    // TAREA 5: aprobar exige TODOS los docs VALIDADOS (sin distinción NATURAL/JURIDICA).
    await this.validarTodosDocumentosValidados(sol.id);

    const actualizada = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: { estado: 'APROBADA' as EstadoSolicitud },
    });

    await this.registrarHistorial(
      sol.id,
      sol.estado as string,
      'APROBADA',
      'Solicitud aprobada (revisión documental finalizada, todos los documentos validados)',
      userId,
    );

    await this.notificarCiudadano(
      sol.id,
      'Solicitud aprobada',
      `Su solicitud ${sol.codigoFormulario} fue APROBADA. Ya puede pasar a emisión del certificado.`,
    );

    return actualizada;
  }

  /**
   * TAREA 4 — NUEVO endpoint: finalizar revisión documental.
   * POST /admin/profesionales/solicitudes/:codigo/finalizar-revision-documentos
   * Lógica idéntica para NATURAL y JURIDICA.
   * - Exige estado EN_REVISION (o ENVIADA por compat con reenvíos).
   * - Exige ≥1 documento y CERO en PENDIENTE (botón se habilita solo entonces).
   * - Todos VALIDADOS → REVISADO (habilita Aprobar).
   * - Algún RECHAZADO → OBSERVADA + notificación con lista de rechazados.
   */
  async finalizarRevisionDocumentos(codigo: string, userId: number) {
    const sol = await this.getSolicitudValidada(codigo);

    if (!['EN_REVISION', 'ENVIADA'].includes(sol.estado as string)) {
      throw new BadRequestException(
        `Solo se puede finalizar la revisión en EN_REVISION. Estado actual: ${sol.estado}`,
      );
    }

    const docs = await this.prisma.documentos.findMany({
      where: { solicitudId: sol.id },
      orderBy: { createdAt: 'asc' },
    });

    if (docs.length === 0) {
      throw new BadRequestException(
        'La solicitud no tiene documentos para revisar',
      );
    }

    const pendientes = docs.filter((d) => d.estado === 'PENDIENTE');
    if (pendientes.length > 0) {
      throw new BadRequestException(
        `Hay ${pendientes.length} documento(s) sin revisar: ${pendientes
          .map((d) => d.nombreOriginal)
          .join(', ')}`,
      );
    }

    const rechazados = docs.filter((d) => d.estado === 'RECHAZADO');

    if (rechazados.length === 0) {
      this.validarTransicion(sol.estado as string, 'REVISADO');
      const actualizada = await this.prisma.solicitudes.update({
        where: { id: sol.id },
        data: {
          estado: 'REVISADO' as EstadoSolicitud,
          revisadoPorId: userId,
        },
      });
      await this.registrarHistorial(
        sol.id,
        sol.estado as string,
        'REVISADO',
        `Revisión documental finalizada: ${docs.length}/${docs.length} validados. Lista para aprobar.`,
        userId,
      );
      await this.notificarCiudadano(
        sol.id,
        'Revisión documental finalizada',
        `Su solicitud ${sol.codigoFormulario} superó la revisión documental (${docs.length}/${docs.length} validados). Está lista para aprobación.`,
      );
      return {
        estado: 'REVISADO',
        todosValidados: true,
        total: docs.length,
        validados: docs.length,
        rechazados: 0,
        solicitud: actualizada,
      };
    }

    // Hay rechazados → OBSERVADA + notificación con lista
    this.validarTransicion(sol.estado as string, 'OBSERVADA');
    const lista = rechazados
      .map((d) => `- ${d.tipo} (${d.nombreOriginal}): ${this.motivoCorto(d.observaciones)}`)
      .join('\n');
    const justificacion =
      `Revisión documental finalizada con ${rechazados.length} documento(s) observado(s):\n${lista}`;

    const actualizada = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: {
        estado: 'OBSERVADA' as EstadoSolicitud,
        revisadoPorId: userId,
      },
    });
    await this.registrarHistorial(
      sol.id,
      sol.estado as string,
      'OBSERVADA',
      justificacion,
      userId,
    );
    await this.notificarCiudadano(
      sol.id,
      'Solicitud observada: documentos por corregir',
      `Su solicitud ${sol.codigoFormulario} fue OBSERVADA. Documentos a corregir:\n${lista}\nLos documentos validados se conservan; corrija solo los observados y reenvíe.`,
    );

    return {
      estado: 'OBSERVADA',
      todosValidados: false,
      total: docs.length,
      validados: docs.length - rechazados.length,
      rechazados: rechazados.length,
      detalleRechazados: rechazados.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        nombreOriginal: d.nombreOriginal,
        motivo: d.observaciones,
      })),
      solicitud: actualizada,
    };
  }

  async observar(codigo: string, justificacion: string, userId: number) {
    if (!justificacion || justificacion.trim().length < 10) {
      throw new BadRequestException(
        'La justificación es obligatoria (mínimo 10 caracteres)',
      );
    }

    const sol = await this.getSolicitudValidada(codigo);

    this.validarTransicion(sol.estado as string, 'OBSERVADA');

    const actualizada = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: { estado: 'OBSERVADA' as EstadoSolicitud },
    });

    await this.registrarHistorial(
      sol.id,
      sol.estado as string,
      'OBSERVADA',
      justificacion,
      userId,
    );

    await this.notificarCiudadano(
      sol.id,
      'Solicitud observada',
      `Su solicitud ${sol.codigoFormulario} fue OBSERVADA: ${justificacion}`,
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

    this.validarTransicion(sol.estado as string, 'RECHAZADA');

    const actualizada = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: { estado: 'RECHAZADA' as EstadoSolicitud },
    });

    await this.registrarHistorial(
      sol.id,
      sol.estado as string,
      'RECHAZADA',
      justificacion,
      userId,
    );

    await this.notificarCiudadano(
      sol.id,
      'Solicitud rechazada',
      `Su solicitud ${sol.codigoFormulario} fue RECHAZADA: ${justificacion}`,
    );

    return actualizada;
  }

  // ============================================================
  // CERTIFICADOS
  // ============================================================

  async emitirCertificado(
    codigo: string,
    dto: EmitirCertificadoDto,
    userId: number,
  ) {
    const sol = await this.getSolicitudValidada(codigo);

    if (sol.estado !== 'APROBADA') {
      throw new BadRequestException(
        `Solo se puede emitir certificado de solicitudes APROBADAS. Estado actual: ${sol.estado}`,
      );
    }

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
    fechaVigencia.setFullYear(fechaVigencia.getFullYear() + 2);

    const certificado = await this.prisma.$transaction(async (tx) => {
      const cert = await tx.certificados.create({
        data: {
          solicitudId: sol.id,
          tipo: TipoCertificado.PROFESIONAL,
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
          estado: 'CERTIFICADO_EMITIDO' as EstadoSolicitud,
          fechaVigencia,
        },
      });

      await tx.historial_solicitudes.create({
        data: {
          solicitudId: sol.id,
          estadoAnterior: 'APROBADA' as EstadoSolicitud,
          estadoNuevo: 'CERTIFICADO_EMITIDO' as EstadoSolicitud,
          comentario: `Certificado emitido: ${codigoCertificado}${
            dto.observaciones ? ` — ${dto.observaciones}` : ''
          }`,
          realizadoPorId: userId,
        },
      });

      return cert;
    });

    // Generar PDF + QR (no bloquea la respuesta si falla el PDF, pero loguea)
    // Nota: certificados NO tiene campo rutaArchivo en schema.prisma:338 — no se persiste
    let rutaArchivo = `uploads/certificados/${codigoCertificado}.pdf`;
    let qrBase64 = '';
    try {
      // Re-cargar datos del titular para el PDF
      const completa = await this.prisma.solicitudes.findUnique({
        where: { id: sol.id },
        include: {
          usuario: { select: { nombre: true, apellido: true } },
          empresa: { select: { razonSocial: true, nit: true } },
        },
      });
      const datosJson = (sol.datosJson as Record<string, unknown>) || {};
      const isJuridica = sol.subtipoTramite === 'JURIDICA';
      const result = await this.pdfService.generarCertificadoProfesional({
        codigoCertificado,
        tipo: isJuridica ? 'JURIDICA' : 'NATURAL',
        titular: {
          nombre: completa?.usuario
            ? `${completa.usuario.nombre} ${completa.usuario.apellido ?? ''}`.trim()
            : (datosJson.nombreCompleto as string) || undefined,
          razonSocial: completa?.empresa?.razonSocial || (datosJson.razonSocial as string) || undefined,
          ci: (datosJson.ci as string) || undefined,
          nit: completa?.empresa?.nit || (datosJson.nit as string) || undefined,
        },
        detalle: {
          profesion: datosJson.profesion as string | undefined,
          matricula: datosJson.matricula as string | undefined,
          especialidad: datosJson.especialidad as string | undefined,
          representanteLegal: (datosJson.representanteLegal as string) || (datosJson.nombreCompleto as string) || undefined,
          actividadEconomica: datosJson.actividadEconomica as string | undefined,
          ...datosJson,
        },
        fechaEmision,
        fechaVigencia,
      });
      rutaArchivo = result.rutaArchivo;
      qrBase64 = result.qrBase64;
    } catch (e) {
      // No fallar el emitir si el PDF falla; se puede regenerar vía descargar
      // eslint-disable-next-line no-console
      console.warn(`PDF no generado para ${codigoCertificado}:`, e);
    }

    return {
      ...certificado,
      rutaArchivo,
      qrBase64,
    };
  }

  // ============================================================
  // LISTA DE PROFESIONALES CERTIFICADOS
  // ============================================================

  async listaCertificados(
    tipo: TipoProfesional | undefined,
    query: QueryProfesionalesDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {
      activo: true,
      solicitud: {
        tipoTramite: 'REGISTRO_PROFESIONAL',
        ...(tipo ? { subtipoTramite: tipo } : {}),
      },
    };

    if (query.search) {
      where.OR = [
        { codigoCertificado: { contains: query.search, mode: 'insensitive' } },
        { solicitud: { codigoFormulario: { contains: query.search, mode: 'insensitive' } } },
        { solicitud: { usuario: { nombre: { contains: query.search, mode: 'insensitive' } } } },
        { solicitud: { empresa: { razonSocial: { contains: query.search, mode: 'insensitive' } } } },
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
              usuario: { select: { id: true, nombre: true, email: true } },
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

  // ============================================================
  // REPORTES
  // ============================================================

  async reporteSolicitudesPorEstado() {
    const result = await this.prisma.solicitudes.groupBy({
      by: ['estado'],
      where: {
        tipoTramite: 'REGISTRO_PROFESIONAL',
      },
      _count: { estado: true },
    });

    return result.map((r) => ({
      estado: r.estado,
      total: r._count.estado,
    }));
  }

  async reporteCertificadosPorMes() {
    const certificados = await this.prisma.certificados.findMany({
      where: {
        activo: true,
        solicitud: { tipoTramite: 'REGISTRO_PROFESIONAL' },
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

  async reportePorEspecialidad() {
    const solicitudes = await this.prisma.solicitudes.findMany({
      where: {
        tipoTramite: 'REGISTRO_PROFESIONAL',
        subtipoTramite: 'NATURAL' as any,
        estado: 'CERTIFICADO_EMITIDO' as EstadoSolicitud,
      },
      select: { datosJson: true },
    });

    const porEspecialidad: Record<string, number> = {};
    for (const s of solicitudes) {
      const data = s.datosJson as Record<string, unknown> | null;
      const especialidad = (data?.especialidad as string) || 'Sin especificar';
      porEspecialidad[especialidad] = (porEspecialidad[especialidad] || 0) + 1;
    }

    return Object.entries(porEspecialidad)
      .map(([especialidad, total]) => ({ especialidad, total }))
      .sort((a, b) => b.total - a.total);
  }

  // ============================================================
  // LEGACY CIUDADANO — preservado para compatibilidad
  // ============================================================
  async crear(dto: any, usuarioId: number) {
    throw new BadRequestException('Use el flujo de solicitudes para crear profesionales');
  }
  async findAll(query: any) {
    return this.findSolicitudes('NATURAL', query);
  }
  async findOne(codigo: string) {
    return this.getSolicitudValidada(codigo);
  }

  // ============================================================
  // HELPERS PRIVADOS
  // ============================================================

  private async getSolicitudValidada(codigo: string) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: {
        codigoFormulario: codigo,
        tipoTramite: 'REGISTRO_PROFESIONAL',
      },
    });

    if (!sol) {
      throw new NotFoundException(`Solicitud ${codigo} no encontrada`);
    }

    return sol;
  }

  private validarTransicion(estadoActual: string, estadoNuevo: string) {
    const permitidos =
      SolicitudStateMachine.obtenerEstadosPermitidos(estadoActual as EstadoSolicitud);

    if (!permitidos.includes(estadoNuevo as EstadoSolicitud)) {
      throw new ForbiddenException(
        `Transición no permitida: ${estadoActual} → ${estadoNuevo}. Permitidos: ${permitidos.join(', ')}`,
      );
    }
  }

  /**
   * TAREA 5: aprobar exige TODOS los documentos en VALIDADO.
   * Sin distinción de subtipo (NATURAL/JURIDICA comparten flujo).
   * Si no hay documentos, también bloquea (el trámite exige docs).
   */
  private async validarTodosDocumentosValidados(solicitudId: number) {
    const docs = await this.prisma.documentos.findMany({
      where: { solicitudId },
      select: { id: true, nombreOriginal: true, estado: true },
    });
    if (docs.length === 0) {
      throw new BadRequestException(
        'No se puede aprobar: la solicitud no tiene documentos',
      );
    }
    const noValidados = docs.filter((d) => d.estado !== 'VALIDADO');
    if (noValidados.length > 0) {
      throw new BadRequestException(
        `No se puede aprobar: ${noValidados.length} documento(s) sin validar: ${noValidados
          .map((d) => `${d.nombreOriginal} (${d.estado})`)
          .join(', ')}. Finalice la revisión documental primero.`,
      );
    }
  }

  /** TAREA 10: notificación genérica al ciudadano dueño (sin distinción de subtipo). */
  private async notificarCiudadano(
    solicitudId: number,
    asunto: string,
    mensaje: string,
  ) {
    const sol = await this.prisma.solicitudes.findUnique({
      where: { id: solicitudId },
      select: { usuarioId: true },
    });
    if (!sol) return;
    await this.prisma.notificaciones.create({
      data: {
        usuarioId: sol.usuarioId,
        solicitudId,
        tipo: 'SISTEMA' as any,
        asunto,
        mensaje,
      },
    });
  }

  private motivoCorto(observaciones: string | null): string {
    if (!observaciones) return 'sin motivo registrado';
    // observaciones puede contener "hash:xxx | motivo"; mostrar la parte humana
    const partes = observaciones.split('|').map((p) => p.trim());
    const humano = partes.filter((p) => !p.startsWith('hash:')).join(' | ');
    return (humano || observaciones).slice(0, 200);
  }

  private async registrarHistorial(
    solicitudId: number,
    estadoAnterior: string,
    estadoNuevo: string,
    comentario: string,
    userId: number,
  ) {
    await this.prisma.historial_solicitudes.create({
      data: {
        solicitudId,
        estadoAnterior: estadoAnterior as EstadoSolicitud,
        estadoNuevo: estadoNuevo as EstadoSolicitud,
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
        codigoCertificado: { startsWith: `CERT-${year}-` },
      },
    });
    const numero = String(count + 1).padStart(4, '0');
    return `CERT-${year}-${numero}`;
  }

  async obtenerRutaPdf(codigoCertificado: string): Promise<string> {
    const cert = await this.prisma.certificados.findFirst({
      where: { codigoCertificado },
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
    const ruta = path.join(process.cwd(), 'uploads', 'certificados', `${codigoCertificado}.pdf`);
    if (fs.existsSync(ruta)) return ruta;

    // Regenerar al vuelo (self-healing) si el archivo se perdió
    const sol = (cert as unknown as { solicitud: any }).solicitud;
    const datosJson = (sol?.datosJson as Record<string, unknown>) || {};
    const isJuridica = sol?.subtipoTramite === 'JURIDICA';
    await this.pdfService.generarCertificadoProfesional({
      codigoCertificado: cert.codigoCertificado,
      tipo: isJuridica ? 'JURIDICA' : 'NATURAL',
      titular: {
        nombre: sol?.usuario
          ? `${sol.usuario.nombre} ${sol.usuario.apellido ?? ''}`.trim()
          : (datosJson.nombreCompleto as string) || undefined,
        razonSocial: sol?.empresa?.razonSocial || (datosJson.razonSocial as string) || undefined,
        ci: datosJson.ci as string | undefined,
        nit: sol?.empresa?.nit || (datosJson.nit as string) || undefined,
      },
      detalle: {
        profesion: datosJson.profesion as string | undefined,
        matricula: datosJson.matricula as string | undefined,
        especialidad: datosJson.especialidad as string | undefined,
        representanteLegal: (datosJson.representanteLegal as string) || undefined,
        actividadEconomica: datosJson.actividadEconomica as string | undefined,
        ...datosJson,
      },
      fechaEmision: cert.fechaEmision,
      fechaVigencia: cert.fechaVigencia,
    });
    if (!fs.existsSync(ruta)) throw new NotFoundException('No se pudo regenerar el PDF');
    return ruta;
  }
}
