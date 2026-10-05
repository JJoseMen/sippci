import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calcularHashSha256 } from '../../common/utils/hash.util';
import { QueryDocumentoDto } from './dto/query-documento.dto';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';
import { unlink, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class DocumentosService {
  constructor(private prisma: PrismaService) {}

  async subir(
    codigoSolicitud: string,
    tipoDocumento: string,
    file: any,
    usuarioId: number,
  ) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigoSolicitud },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.usuarioId !== usuarioId)
      throw new ForbiddenException('No es tu solicitud');
    if (!['BORRADOR', 'OBSERVADA'].includes(sol.estado))
      throw new BadRequestException('Solo se pueden subir documentos en BORRADOR u OBSERVADA');
    const TIPOS_VALIDOS = [
      'FORMULARIO',
      'PLANO_SIPPCI',
      'PLAN_EMERGENCIA',
      'CREDENCIAL_PROFESIONAL',
      'NIT',
      'BOLETA_DEPOSITO',
      'CERTIFICADO_ANTERIOR',
      'CI',
      'TITULO_PROFESIONAL',
      'ESCRITURA_PUBLICA',
      'PODER_REPRESENTANTE',
      'LICENCIA_FUNCIONAMIENTO',
      'REGISTRO_COMERCIO',
      'CERTIFICADO_NIT',
      'PLANILLA_EXCEL',
      'COMPROBANTE_PAGO',
      'OTRO',
    ];
    if (!TIPOS_VALIDOS.includes(tipoDocumento))
      throw new BadRequestException(`Tipo de documento no valido: ${tipoDocumento}`);

    const hash = calcularHashSha256(file.buffer);
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    if (!existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true });
    const rutaArchivo = join(UPLOADS_DIR, filename);
    await writeFile(rutaArchivo, file.buffer);

    return this.prisma.documentos.create({
      data: {
        solicitudId: sol.id,
        usuarioId,
        tipo: tipoDocumento as any,
        rutaArchivo,
        nombreOriginal: file.originalname,
        mimeType: file.mimetype,
        tamanoBytes: file.size,
        observaciones: `hash:${hash}`,
      },
    });
  }

  async findAll(codigoSolicitud: string, query: QueryDocumentoDto) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigoSolicitud },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');

    const where: Record<string, unknown> = { solicitudId: sol.id };
    if (query.tipoDocumento) where.tipo = query.tipoDocumento;
    if (query.estado) where.estado = query.estado;

    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);

    const [items, total] = await Promise.all([
      this.prisma.documentos.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.documentos.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const doc = await this.prisma.documentos.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);
    return doc;
  }

  async descargar(id: number, usuario?: { id: number; tipo?: string }) {
    const doc = await this.findOne(id);
    if (!existsSync(doc.rutaArchivo))
      throw new NotFoundException('Archivo no encontrado en storage');
    // TAREA 9 (fase anterior): gestor + ciudadano dueño. Internos siempre;
    // externos solo si son dueños de la solicitud.
    await this.autorizarAccesoDoc(doc.solicitudId, usuario);
    return { ruta: doc.rutaArchivo, nombre: doc.nombreOriginal, mime: doc.mimeType };
  }

  /**
   * TAREA 1 (gaps ciudadano) — Ver documento inline.
   * Misma autorización que descargar; el controller sirve con
   * `Content-Disposition: inline` para preview en pantalla.
   */
  async ver(id: number, usuario?: { id: number; tipo?: string }) {
    const doc = await this.findOne(id);
    if (!existsSync(doc.rutaArchivo))
      throw new NotFoundException('Archivo no encontrado en storage');
    await this.autorizarAccesoDoc(doc.solicitudId, usuario);
    return { ruta: doc.rutaArchivo, nombre: doc.nombreOriginal, mime: doc.mimeType };
  }

  /** Dueño externo o cualquier interno (el rol fino se valida por trámite donde aplica). */
  private async autorizarAccesoDoc(
    solicitudId: number,
    usuario?: { id: number; tipo?: string },
  ) {
    if (!usuario) return;
    if (usuario.tipo === 'externo') {
      const sol = await this.prisma.solicitudes.findUnique({
        where: { id: solicitudId },
        select: { usuarioId: true },
      });
      if (!sol || sol.usuarioId !== usuario.id) {
        throw new ForbiddenException('No tienes acceso a este documento');
      }
    }
  }

  /**
   * TAREA 2 + 3 — Revisión individual de documento (NATURAL y JURIDICA sin distinción).
   * - Solo internos con rol apto al tipoTramite de la solicitud.
   * - RECHAZADO exige motivo ≥10 caracteres.
   * - Notifica al ciudadano en cada validación/rechazo.
   */
  async revisar(
    id: number,
    dto: RevisarDocumentoDto,
    usuario?: { id?: number; rol?: string; tipo?: string },
  ) {
    const doc = await this.findOne(id);
    const sol = await this.prisma.solicitudes.findUnique({
      where: { id: doc.solicitudId },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');

    // Solo internos pueden revisar
    if (!usuario || usuario.tipo !== 'interno') {
      throw new ForbiddenException('Solo el personal interno puede revisar documentos');
    }
    this.validarRolParaTramite(usuario.rol, sol.tipoTramite as string);

    const estado = (dto as unknown as Record<string, unknown>).estado as string;
    // Acepta `observacion` (backend) y `observaciones` (frontend legacy)
    const motivo = (
      ((dto as unknown as Record<string, unknown>).observacion as string | undefined) ??
      ((dto as unknown as Record<string, unknown>).observaciones as string | undefined) ??
      ''
    ).trim();

    if (!['VALIDADO', 'RECHAZADO'].includes(estado)) {
      throw new BadRequestException('Estado no válido. Use VALIDADO o RECHAZADO');
    }
    if (estado === 'RECHAZADO' && motivo.length < 10) {
      throw new BadRequestException(
        'El motivo del rechazo es obligatorio (mínimo 10 caracteres)',
      );
    }
    if (
      !['EN_REVISION', 'ENVIADA', 'REVISADO', 'INSPECCION_PROGRAMADA', 'INFORME_REGISTRADO'].includes(
        sol.estado as string,
      )
    ) {
      throw new BadRequestException(
        `Solo se pueden revisar documentos en revisión. Estado actual: ${sol.estado}`,
      );
    }

    // Conservar hash existente en observaciones y anexar motivo humano
    const prev = doc.observaciones ?? '';
    const observaciones = motivo
      ? prev
        ? `${prev} | ${motivo}`
        : motivo
      : prev;

    const actualizado = await this.prisma.documentos.update({
      where: { id },
      data: {
        estado: estado as any,
        observaciones,
      },
    });

    // TAREA 10: notificación al ciudadano por cada doc validado/rechazado
    await this.prisma.notificaciones.create({
      data: {
        usuarioId: sol.usuarioId,
        solicitudId: sol.id,
        tipo: 'SISTEMA' as any,
        asunto:
          estado === 'VALIDADO'
            ? `Documento validado: ${doc.nombreOriginal}`
            : `Documento rechazado: ${doc.nombreOriginal}`,
        mensaje:
          estado === 'VALIDADO'
            ? `El documento ${doc.tipo} (${doc.nombreOriginal}) de su solicitud ${sol.codigoFormulario} fue VALIDADO.`
            : `El documento ${doc.tipo} (${doc.nombreOriginal}) de su solicitud ${sol.codigoFormulario} fue RECHAZADO. Motivo: ${motivo}`,
      },
    });

    return actualizado;
  }

  /**
   * TAREA 2 + 3 (gaps ciudadano) — Reemplazar documento observado.
   * - Solo si el doc está RECHAZADO (si no → 400).
   * - Solo si la solicitud está en OBSERVADA / ENVIADA / EN_REVISION.
   * - El nuevo archivo pasa a PENDIENTE y limpia el motivo anterior.
   * - Notifica al gestor (TAREA 6) y registra historial.
   * - Vale para NATURAL y JURIDICA sin distinción.
   */
  async reemplazar(
    id: number,
    file: any,
    usuario?: { id?: number; rol?: string; tipo?: string },
  ) {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('Debe adjuntar un archivo (file)');
    }
    this.validarArchivoReemplazo(file);

    const doc = await this.findOne(id);
    const sol = await this.prisma.solicitudes.findUnique({
      where: { id: doc.solicitudId },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');

    // Ownership: ciudadano dueño, o gestor con rol apto al trámite
    if (usuario?.tipo === 'externo') {
      if (!usuario.id || sol.usuarioId !== usuario.id) {
        throw new ForbiddenException('No es tu documento');
      }
    } else if (usuario?.tipo === 'interno') {
      this.validarRolParaTramite(usuario.rol, sol.tipoTramite as string);
    } else {
      throw new ForbiddenException('No autorizado');
    }

    // CRÍTICO: solo RECHAZADO
    if (doc.estado !== 'RECHAZADO') {
      throw new BadRequestException(
        `Solo se pueden reemplazar documentos rechazados. Estado actual: ${doc.estado}`,
      );
    }

    // TAREA 3: solo en OBSERVADA / ENVIADA / EN_REVISION
    if (!['OBSERVADA', 'ENVIADA', 'EN_REVISION'].includes(sol.estado as string)) {
      throw new BadRequestException(
        `Solo se pueden reemplazar documentos en OBSERVADA o revisión. Estado actual: ${sol.estado}`,
      );
    }

    // Guardar nuevo archivo y borrar el anterior
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const filename = `${randomUUID()}.${ext}`;
    if (!existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true });
    const rutaArchivo = join(UPLOADS_DIR, filename);
    await writeFile(rutaArchivo, file.buffer);
    if (existsSync(doc.rutaArchivo)) await unlink(doc.rutaArchivo).catch(() => undefined);

    const hash = calcularHashSha256(file.buffer);
    const actualizado = await this.prisma.documentos.update({
      where: { id },
      data: {
        rutaArchivo,
        nombreOriginal: file.originalname,
        mimeType: file.mimetype,
        tamanoBytes: file.size,
        estado: 'PENDIENTE',
        observaciones: `hash:${hash}`,
      },
    });

    await this.prisma.historial_solicitudes.create({
      data: {
        solicitudId: sol.id,
        estadoAnterior: sol.estado as any,
        estadoNuevo: sol.estado as any,
        comentario: `Documento ${doc.tipo} (${doc.nombreOriginal}) reemplazado por ${file.originalname}. Vuelve a PENDIENTE para revisión.`,
        realizadoPorId: usuario?.id,
      },
    });

    // TAREA 6: notificar al gestor (revisor previo o equipo del trámite)
    await this.notificarReemplazoAlGestor(sol);

    return actualizado;
  }

  private validarArchivoReemplazo(file: any) {
    const MIMES_VALIDOS = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (file.mimetype && !MIMES_VALIDOS.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no válido: ${file.mimetype}. Use PDF o imagen (JPG/PNG/WEBP)`,
      );
    }
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('El archivo supera el máximo de 10 MB');
    }
  }

  /** TAREA 6: avisa al revisor previo y al equipo gestor del trámite. Tipo SISTEMA (enum actual). */
  private async notificarReemplazoAlGestor(sol: {
    id: number;
    codigoFormulario: string;
    tipoTramite: string;
    revisadoPorId?: number | null;
  }) {
    const rolesPorTramite: Record<string, string[]> = {
      REGISTRO_PROFESIONAL: ['ADMIN', 'GESTOR_REGISTRO_PROFESIONAL'],
      CERTIFICACION_SIPPCI: ['ADMIN', 'GESTOR_CUMPLIMIENTO'],
      CAPACITACION: ['ADMIN', 'GESTOR_CAPACITACIONES'],
    };
    const roles = rolesPorTramite[sol.tipoTramite] ?? ['ADMIN'];
    const equipo = await this.prisma.usuarios_internos.findMany({
      where: { rol: { in: roles as any }, activo: true },
      select: { id: true },
    });
    const ids = new Set(equipo.map((u) => u.id));
    if (sol.revisadoPorId) ids.add(sol.revisadoPorId);
    if (ids.size === 0) return;
    await this.prisma.notificaciones.createMany({
      data: [...ids].map((internoId) => ({
        usuarioInternoId: internoId,
        solicitudId: sol.id,
        tipo: 'SISTEMA' as any,
        asunto: `Documento reemplazado en ${sol.codigoFormulario}`,
        mensaje: `El ciudadano reemplazó un documento observado en la solicitud ${sol.codigoFormulario}. Revise el documento en estado PENDIENTE.`,
      })),
    });
  }

  /** TAREA 2: el rol debe ser apto para el tipoTramite (subtipo NATURAL/JURIDICA irrelevante). */
  private validarRolParaTramite(rol: string | undefined, tipoTramite: string) {
    const permitidosPorTramite: Record<string, string[]> = {
      REGISTRO_PROFESIONAL: ['ADMIN', 'GESTOR_REGISTRO_PROFESIONAL'],
      CERTIFICACION_SIPPCI: ['ADMIN', 'GESTOR_CUMPLIMIENTO'],
      CAPACITACION: ['ADMIN', 'GESTOR_CAPACITACIONES'],
      RENOVACION: ['ADMIN', 'GESTOR_REGISTRO_PROFESIONAL', 'GESTOR_CUMPLIMIENTO'],
    };
    const permitidos = permitidosPorTramite[tipoTramite] ?? ['ADMIN'];
    if (!rol || !permitidos.includes(rol)) {
      throw new ForbiddenException(
        `Rol ${rol ?? 'desconocido'} no autorizado para revisar documentos de ${tipoTramite}. Permitidos: ${permitidos.join(', ')}`,
      );
    }
  }

  async remove(id: number, usuarioId: number) {
    const doc = await this.findOne(id);
    const sol = await this.prisma.solicitudes.findUnique({ where: { id: doc.solicitudId } });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.usuarioId !== usuarioId)
      throw new ForbiddenException('No es tu solicitud');
    if (!['BORRADOR', 'OBSERVADA'].includes(sol.estado))
      throw new BadRequestException('Solo se pueden eliminar documentos en BORRADOR u OBSERVADA');

    if (existsSync(doc.rutaArchivo)) await unlink(doc.rutaArchivo);
    await this.prisma.documentos.delete({ where: { id } });
    return { message: 'Documento eliminado' };
  }
}
