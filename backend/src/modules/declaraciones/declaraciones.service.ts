import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoDeclaracion } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { calcularHashSha256 } from '../../common/utils/hash.util';
import { generarCodigoJurada } from '../../common/utils/codigo.util';
import { QueryDeclaracionDto } from './dto/query-declaracion.dto';
import { AprobarDeclaracionDto } from './dto/aprobar-declaracion.dto';

const DECL_DIR = join(process.cwd(), 'uploads', 'declaraciones');

@Injectable()
export class DeclaracionesService {
  constructor(private prisma: PrismaService) {}

  async generarPdf(codigoSolicitud: string, _usuarioId: number) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigoSolicitud },
      include: { usuario: true, empresa: true },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.tipoTramite !== 'CERTIFICACION_SIPPCI')
      throw new BadRequestException(
        'La declaracion jurada solo aplica a tramites SIPPCI',
      );

    const existente = await this.prisma.declaraciones_juradas.findFirst({
      where: { solicitudId: sol.id },
    });
    if (
      existente &&
      ['FIRMADA_SUBIDA', 'APROBADA', 'RECHAZADA'].includes(existente.estado)
    )
      throw new BadRequestException(
        'La declaracion ya fue firmada o resuelta; no se puede regenerar',
      );

    const datos = (sol.datosJson ?? {}) as Record<string, unknown>;
    const firmadoPor =
      (datos.nombreCompleto as string) ||
      (datos.nombrerz as string) ||
      sol.usuario?.nombre ||
      'SIN NOMBRE';
    const ciFirmante =
      (datos.ci as string) ||
      (datos.nit as string) ||
      sol.usuario?.email ||
      'SIN CI/NIT';

    const count = await this.prisma.declaraciones_juradas.count();
    const codigo = generarCodigoJurada(count + 1);
    const textoLegal = this.generarTextoLegal(
      firmadoPor,
      ciFirmante,
      sol.tipoTramite,
      codigo,
    );

    const pdfBuffer = await this.generarBufferPdf(
      codigo,
      sol.codigoFormulario,
      firmadoPor,
      ciFirmante,
      sol.usuario?.email ?? '',
      sol.usuario?.telefono ?? '',
      datos,
      textoLegal,
    );
    const hash = calcularHashSha256(pdfBuffer);

    if (!existsSync(DECL_DIR)) await mkdir(DECL_DIR, { recursive: true });
    const rutaPdf = join(DECL_DIR, `${codigo}.pdf`);
    await writeFile(rutaPdf, pdfBuffer);

    const decl =
      existente ??
      (await this.prisma.declaraciones_juradas.create({
        data: {
          solicitudId: sol.id,
          codigoDeclaracion: codigo,
          pdfGeneradoRuta: rutaPdf,
          pdfGeneradoHash: hash,
          firmadoPor,
          ciFirmante,
          estado: EstadoDeclaracion.GENERADA,
        },
      }));

    const guardada =
      existente
        ? await this.prisma.declaraciones_juradas.update({
            where: { id: decl.id },
            data: {
              codigoDeclaracion: codigo,
              pdfGeneradoRuta: rutaPdf,
              pdfGeneradoHash: hash,
              firmadoPor,
              ciFirmante,
              pdfFirmadoRuta: null,
              pdfFirmadoHash: null,
              fechaFirma: null,
              observacion: null,
              estado: EstadoDeclaracion.GENERADA,
            },
          })
        : decl;

    return {
      id: guardada.id,
      codigoDeclaracion: guardada.codigoDeclaracion,
      rutaPdf: guardada.pdfGeneradoRuta,
      hash: guardada.pdfGeneradoHash,
      estado: guardada.estado,
    };
  }

  async descargarPdf(codigoSolicitud: string) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigoSolicitud },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    const decl = await this.prisma.declaraciones_juradas.findFirst({
      where: { solicitudId: sol.id },
    });
    if (!decl) throw new NotFoundException('Declaracion no encontrada');
    if (!existsSync(decl.pdfGeneradoRuta))
      throw new NotFoundException('PDF generado no encontrado en storage');
    return {
      ruta: decl.pdfGeneradoRuta,
      nombre: `${decl.codigoDeclaracion}.pdf`,
      mime: 'application/pdf',
    };
  }

  async descargarPdfFirmado(id: number) {
    const decl = await this.prisma.declaraciones_juradas.findUnique({
      where: { id },
    });
    if (!decl) throw new NotFoundException(`Declaracion ${id} no encontrada`);
    if (!decl.pdfFirmadoRuta)
      throw new BadRequestException('Aun no se ha subido el PDF firmado');
    if (!existsSync(decl.pdfFirmadoRuta))
      throw new NotFoundException('PDF firmado no encontrado en storage');
    return {
      ruta: decl.pdfFirmadoRuta,
      nombre: `${decl.codigoDeclaracion}_FIRMADO.pdf`,
      mime: 'application/pdf',
    };
  }

  async subirFirmada(codigoSolicitud: string, file: any) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigoSolicitud },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    const decl = await this.prisma.declaraciones_juradas.findFirst({
      where: { solicitudId: sol.id },
    });
    if (!decl) throw new NotFoundException('Declaracion no encontrada');
    if (decl.estado !== EstadoDeclaracion.GENERADA)
      throw new BadRequestException(
        `La declaracion debe estar GENERADA para subir el PDF firmado (actual: ${decl.estado})`,
      );
    if (!file || !file.buffer)
      throw new BadRequestException('Archivo PDF firmado requerido');
    if (file.mimetype !== 'application/pdf' && !/\.pdf$/i.test(file.originalname))
      throw new BadRequestException('El archivo firmado debe ser PDF');

    const hash = calcularHashSha256(file.buffer);
    if (!existsSync(DECL_DIR)) await mkdir(DECL_DIR, { recursive: true });
    const ruta = join(DECL_DIR, `${decl.codigoDeclaracion}_FIRMADO.pdf`);
    await writeFile(ruta, file.buffer);

    return this.prisma.declaraciones_juradas.update({
      where: { id: decl.id },
      data: {
        pdfFirmadoRuta: ruta,
        pdfFirmadoHash: hash,
        fechaFirma: new Date(),
        estado: EstadoDeclaracion.FIRMADA_SUBIDA,
      },
    });
  }

  async aprobar(id: number, dto: AprobarDeclaracionDto, _usuarioInternoId: number) {
    const decl = await this.prisma.declaraciones_juradas.findUnique({
      where: { id },
    });
    if (!decl) throw new NotFoundException(`Declaracion ${id} no encontrada`);
    if (decl.estado !== EstadoDeclaracion.FIRMADA_SUBIDA)
      throw new BadRequestException(
        'Solo se puede aprobar una declaracion FIRMADA_SUBIDA',
      );
    return this.prisma.declaraciones_juradas.update({
      where: { id },
      data: {
        estado: EstadoDeclaracion.APROBADA,
        observacion: dto.observacion ?? null,
      },
    });
  }

  async rechazar(id: number, dto: AprobarDeclaracionDto, _usuarioInternoId: number) {
    const decl = await this.prisma.declaraciones_juradas.findUnique({
      where: { id },
    });
    if (!decl) throw new NotFoundException(`Declaracion ${id} no encontrada`);
    return this.prisma.declaraciones_juradas.update({
      where: { id },
      data: {
        estado: EstadoDeclaracion.RECHAZADA,
        observacion: dto.observacion ?? null,
      },
    });
  }

  async findOne(codigoSolicitud: string) {
    const sol = await this.prisma.solicitudes.findFirst({
      where: { codigoFormulario: codigoSolicitud },
    });
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    const decl = await this.prisma.declaraciones_juradas.findFirst({
      where: { solicitudId: sol.id },
      include: {
        solicitud: {
          select: { id: true, codigoFormulario: true, estado: true },
        },
      },
    });
    if (!decl) throw new NotFoundException('Declaracion no encontrada');
    return decl;
  }

  async findAll(query: QueryDeclaracionDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { codigoDeclaracion: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.estado) where.estado = query.estado;
    if (query.fechaDesde || query.fechaHasta) {
      where.createdAt = {};
      if (query.fechaDesde)
        (where.createdAt as any).gte = new Date(query.fechaDesde);
      if (query.fechaHasta)
        (where.createdAt as any).lte = new Date(query.fechaHasta);
    }

    const [items, total] = await Promise.all([
      this.prisma.declaraciones_juradas.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          solicitud: {
            select: { id: true, codigoFormulario: true, estado: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.declaraciones_juradas.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async verificarHash(id: number) {
    const decl = await this.prisma.declaraciones_juradas.findUnique({
      where: { id },
    });
    if (!decl) throw new NotFoundException(`Declaracion ${id} no encontrada`);
    return {
      id: decl.id,
      codigoDeclaracion: decl.codigoDeclaracion,
      hashGeneradoValido: true,
      tienePdfFirmado: decl.pdfFirmadoRuta != null,
    };
  }

  private generarTextoLegal(
    nombre: string,
    ci: string,
    tipoTramite: string,
    codigo: string,
  ): string {
    const fecha = new Date().toISOString().split('T')[0];
    return `DECLARACION JURADA - ${tipoTramite} - ${codigo}

Yo, ${nombre}, portador del C.I./NIT ${ci}, en mi condicion de solicitante, en cumplimiento de lo dispuesto en el articulo 1322 del Codigo Civil boliviano, DECLARO bajo juramento que:

1. Toda la informacion proporcionada en la presente solicitud es veraz, completa y fidedigna.
2. Los contenidos tecnicos implementados (plano de diseno SIPPCI, plan de emergencia, senalizacion, brigadas y demas) se encuentran efectivamente implementados en la empresa.
3. Asumo la responsabilidad por cualquier alteracion, falsificacion o falsedad en la presente declaracion.
4. Autorizo a la Direccion Nacional de Bomberos de la Policia Boliviana a verificar la informacion proporcionada.

En caso de evidenciarse actos de modificacion, alteracion o falsificacion, y de producirse algun tipo de incendio por la falta o inadecuada implementacion de las medidas de prevencion, procedera imponer las sanciones que correspondan conforme a normativa vigente.

Fecha: ${fecha}
Lugar para firma: ${nombre}`;
  }

  private async generarBufferPdf(
    codigo: string,
    codigoSolicitud: string,
    firmadoPor: string,
    ciFirmante: string,
    email: string,
    telefono: string,
    datos: Record<string, unknown>,
    textoLegal: string,
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(14).text('DIRECCION NACIONAL DE BOMBEROS', { align: 'center' });
    doc.fontSize(10).text('POLICIA BOLIVIANA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(13).text(
      'DECLARACION JURADA - CERTIFICACION SIPPCI',
      { align: 'center', underline: true },
    );
    doc.moveDown(0.75);
    doc.fontSize(11).text(`Codigo de Declaracion: ${codigo}`);
    doc.text(`Codigo de Solicitud: ${codigoSolicitud}`);
    doc.moveDown(0.5);

    doc.fontSize(12).text('1. DATOS DEL SOLICITANTE', { underline: true });
    doc.fontSize(10);
    doc.text(`Nombre o Razon Social: ${firmadoPor}`);
    doc.text(`CI/NIT: ${ciFirmante}`);
    doc.text(`Correo: ${email || '-'}`);
    doc.text(`Telefono: ${telefono || '-'}`);
    doc.moveDown(0.5);

    doc.fontSize(12).text('2. DATOS DE LA INFRAESTRUCTURA', { underline: true });
    doc.fontSize(10);
    const tipo = (datos.tipoInfraestructura as string) || (datos.tipo as string);
    doc.text(`Tipo de Infraestructura: ${tipo || '-'}`);
    doc.text(
      `Superficie: ${(datos.superficie as string) ?? '-'} m2  |  Aforo Maximo: ${
        (datos.aforoMaximo as string) ?? '-'
      }  |  Numero de Pisos: ${(datos.numeroPisos as string) ?? '-'}`,
    );
    doc.text(`Nivel de Riesgo: ${(datos.nivelRiesgo as string) ?? '-'}`);
    doc.text(
      `Actividad Principal: ${(datos.actividadPrincipal as string) ?? '-'}`,
    );
    doc.moveDown(0.5);

    doc.fontSize(12).text('3. CUERPO DE LA DECLARACION', { underline: true });
    doc.fontSize(10);
    doc.text(textoLegal, { align: 'justify' });
    doc.moveDown(0.75);

    doc.fontSize(10).text('Firma: ______________________________', {
      align: 'center',
    });
    doc.moveDown(0.25);

    const qrData = `SIPPCI|${codigo}|${codigoSolicitud}|${ciFirmante}`;
    const qrUrl = await QRCode.toDataURL(qrData);
    const qrBuf = Buffer.from(qrUrl.split(',')[1], 'base64');
    doc.image(qrBuf, 50, doc.y, { width: 70, height: 70 });
    doc.text('Escanee para verificar', 125, doc.y + 55);

    doc.end();
    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }
}