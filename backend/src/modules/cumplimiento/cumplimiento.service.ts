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
import { CumplimientoStateMachine as SolicitudStateMachine } from './state-machine/cumplimiento.state-machine';
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

    // FIX 2 (Opción A, sin migración): INFRAESTRUCTURA visible según tipoPersona.
    // El wizard SIPPCI crea subtipo INFRAESTRUCTURA para no-JURIDICA, así que
    // la lista Natural incluye NATURAL + INFRA; la lista Jurídica incluye
    // JURIDICA + INFRA con tipoPersona=JURIDICA. Rutas sin cambios.
    const filtroGrupo =
      tipo === 'NATURAL'
        ? [{ subtipoTramite: 'NATURAL' }, { subtipoTramite: 'INFRAESTRUCTURA' }]
        : [
            { subtipoTramite: 'JURIDICA' },
            {
              subtipoTramite: 'INFRAESTRUCTURA',
              datosJson: { path: ['tipoPersona'], equals: 'JURIDICA' },
            },
          ];

    const and: Record<string, unknown>[] = [{ OR: filtroGrupo }];

    if (query.estado) and.push({ estado: query.estado });

    if (query.nivelRiesgo) {
      and.push({ datosJson: { path: ['nivelRiesgo'], equals: query.nivelRiesgo } });
    }

    if (query.search) {
      and.push({
        OR: [
          { codigoFormulario: { contains: query.search, mode: 'insensitive' } },
          { usuario: { nombre: { contains: query.search, mode: 'insensitive' } } },
          { empresa: { razonSocial: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    if (query.fechaDesde || query.fechaHasta) {
      const createdAt: Record<string, unknown> = {};
      if (query.fechaDesde) {
        createdAt.gte = new Date(query.fechaDesde);
      }
      if (query.fechaHasta) {
        createdAt.lte = new Date(query.fechaHasta + 'T23:59:59Z');
      }
      and.push({ createdAt });
    }

    const where: Record<string, unknown> = {
      tipoTramite: TIPO_TRAMITE,
      AND: and,
    };

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

    // FIX 2: INFRAESTRUCTURA pertenece al grupo según tipoPersona
    // (NATURAL por defecto, como el wizard: user?.tipoPersona || 'NATURAL').
    if (!this.esDelGrupo(sol.subtipoTramite as string, sol.datosJson, tipo)) {
      throw new NotFoundException(
        `Solicitud ${codigo} no encontrada para tipo ${tipo}`,
      );
    }

    return sol;
  }

  private esDelGrupo(
    subtipo: string,
    datosJson: unknown,
    tipo: TipoCumplimiento,
  ): boolean {
    if (subtipo === tipo) return true;
    if (subtipo !== 'INFRAESTRUCTURA') return false;
    const tipoPersona = (datosJson as Record<string, unknown> | null)?.tipoPersona;
    return tipo === 'JURIDICA'
      ? tipoPersona === 'JURIDICA'
      : tipoPersona !== 'JURIDICA';
  }

  // ============================================================
  // ACCIONES
  // ============================================================

  async aprobar(codigo: string, userId: number) {
    const sol = await this.getSolicitudValidada(codigo);

    // FIX 3 — Inspección obligatoria: aprobar SOLO desde INFORME_REGISTRADO
    // (informe CONFORME). Sin atajo EN_REVISION -> APROBADA.
    if (sol.estado !== 'INFORME_REGISTRADO') {
      throw new BadRequestException(
        `Solo se puede aprobar con informe CONFORME registrado. Estado actual: ${sol.estado}`,
      );
    }

    this.validarTransicion(sol.estado, 'APROBADA');

    // Aprobar exige TODOS los documentos VALIDADOS (NATURAL/JURIDICA/INFRA sin distinción).
    await this.validarTodosDocumentosValidados(sol.id);

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

    await this.notificarCiudadano(
      sol.id,
      'Solicitud rechazada',
      `Su solicitud ${sol.codigoFormulario} fue RECHAZADA: ${justificacion}`,
    );

    return actualizada;
  }

  // ============================================================
  // REVISIÓN DOCUMENTAL (FIX 1 — NATURAL/JURIDICA/INFRA sin distinción)
  // ============================================================

  /**
   * Finalizar revisión documental.
   * - Todos VALIDADOS → permanece EN_REVISION + marca revisadoPorId
   *   (habilita Programar Inspección). Sin botón intermedio.
   * - Con RECHAZADOS → OBSERVADA + notificación con lista.
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
      const actualizada = await this.prisma.solicitudes.update({
        where: { id: sol.id },
        data: { revisadoPorId: userId },
      });
      await this.registrarHistorial(
        sol.id,
        sol.estado,
        sol.estado,
        `Revisión documental finalizada (Cumplimiento): ${docs.length}/${docs.length} validados. Habilitada la inspección técnica.`,
        userId,
      );
      await this.notificarCiudadano(
        sol.id,
        'Revisión documental finalizada',
        `Su solicitud ${sol.codigoFormulario} superó la revisión documental (${docs.length}/${docs.length} validados). Sigue la inspección técnica.`,
      );
      return {
        estado: sol.estado,
        todosValidados: true,
        total: docs.length,
        validados: docs.length,
        rechazados: 0,
        solicitud: actualizada,
      };
    }

    this.validarTransicion(sol.estado, 'OBSERVADA');
    const lista = rechazados
      .map((d) => `- ${d.tipo} (${d.nombreOriginal}): ${this.motivoCorto(d.observaciones)}`)
      .join('\n');
    const justificacion =
      `Revisión documental finalizada con ${rechazados.length} documento(s) observado(s):\n${lista}`;

    const actualizada = await this.prisma.solicitudes.update({
      where: { id: sol.id },
      data: {
        estado: 'OBSERVADA',
        revisadoPorId: userId,
      },
    });
    await this.registrarHistorial(
      sol.id,
      sol.estado,
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

    // FIX 1/3: programar exige revisión documental finalizada
    // (todos los documentos VALIDADOS).
    await this.validarTodosDocumentosValidados(sol.id);

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

  /** Aprobar/programar exigen TODOS los documentos en VALIDADO (sin distinción de subtipo). */
  private async validarTodosDocumentosValidados(solicitudId: number) {
    const docs = await this.prisma.documentos.findMany({
      where: { solicitudId },
      select: { id: true, nombreOriginal: true, estado: true },
    });
    if (docs.length === 0) {
      throw new BadRequestException(
        'No se puede continuar: la solicitud no tiene documentos',
      );
    }
    const noValidados = docs.filter((d) => d.estado !== 'VALIDADO');
    if (noValidados.length > 0) {
      throw new BadRequestException(
        `No se puede continuar: ${noValidados.length} documento(s) sin validar: ${noValidados
          .map((d) => `${d.nombreOriginal} (${d.estado})`)
          .join(', ')}. Finalice la revisión documental primero.`,
      );
    }
  }

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
        tipo: 'SISTEMA' as never,
        asunto,
        mensaje,
      },
    });
  }

  private motivoCorto(observaciones: string | null): string {
    if (!observaciones) return 'sin motivo registrado';
    const partes = observaciones.split('|').map((p) => p.trim());
    const humano = partes.filter((p) => !p.startsWith('hash:')).join(' | ');
    return (humano || observaciones).slice(0, 200);
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
