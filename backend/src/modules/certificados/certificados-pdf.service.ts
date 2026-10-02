import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';

@Injectable()
export class CertificadosPdfService {
  private readonly logger = new Logger(CertificadosPdfService.name);

  async generarCertificadoProfesional(datos: {
    codigoCertificado: string;
    tipo: 'NATURAL' | 'JURIDICA';
    titular: {
      nombre?: string;
      razonSocial?: string;
      ci?: string;
      nit?: string;
    };
    detalle: {
      profesion?: string;
      matricula?: string;
      especialidad?: string;
      representanteLegal?: string;
      actividadEconomica?: string;
      [key: string]: unknown;
    };
    fechaEmision: Date;
    fechaVigencia: Date;
  }): Promise<{ rutaArchivo: string; qrBase64: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const urlValidacion = `${frontendUrl}/validar-certificado/${datos.codigoCertificado}`;

    const qrBase64 = await QRCode.toDataURL(urlValidacion, {
      width: 180,
      margin: 1,
      color: { dark: '#0f1f3c', light: '#ffffff' },
    });

    // Carpeta destino
    const dir = path.join(process.cwd(), 'uploads', 'certificados');
    fs.mkdirSync(dir, { recursive: true });
    const rutaArchivo = path.join(dir, `${datos.codigoCertificado}.pdf`);
    const rutaRelativa = path.join('uploads', 'certificados', `${datos.codigoCertificado}.pdf`);

    // Crear PDF A4 landscape
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 40,
    });

    const stream = fs.createWriteStream(rutaArchivo);
    doc.pipe(stream);

    // Colores institucionales
    const rojo = '#c8102e';
    const azul = '#0f1f3c';
    const grisClaro = '#f3f4f6';

    // Fondo gris claro borde
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(2)
      .strokeColor(azul)
      .stroke();
    doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48)
      .lineWidth(0.5)
      .strokeColor(rojo)
      .stroke();

    // Header
    doc
      .fontSize(10)
      .fillColor(azul)
      .font('Helvetica-Bold')
      .text('DIRECCION NACIONAL DE BOMBEROS', 40, 38, { align: 'center' });
    doc
      .fontSize(8)
      .fillColor(rojo)
      .font('Helvetica')
      .text('SISTEMA DE PREVENCION Y PROTECCION CONTRA INCENDIOS — SIPPCI', 40, 52, { align: 'center' });

    // Título
    doc
      .fontSize(22)
      .fillColor(azul)
      .font('Helvetica-Bold')
      .text('CERTIFICADO DE PROFESIONAL', 40, 80, { align: 'center' });

    const subtitulo =
      datos.tipo === 'JURIDICA' ? 'Persona Jurídica' : 'Persona Natural';
    doc
      .fontSize(11)
      .fillColor(rojo)
      .font('Helvetica')
      .text(subtitulo.toUpperCase(), 40, 108, { align: 'center' });

    // Línea decorativa
    doc
      .moveTo(280, 126)
      .lineTo(doc.page.width - 280, 126)
      .lineWidth(1.5)
      .strokeColor(rojo)
      .stroke();

    // Cuerpo
    const titularNombre = datos.titular.razonSocial || datos.titular.nombre || '—';
    const documento = datos.titular.nit || datos.titular.ci || '—';

    let y = 145;
    doc
      .fontSize(11)
      .fillColor('#111827')
      .font('Helvetica')
      .text('Se certifica que:', 60, y, { align: 'center' });

    y += 18;
    doc
      .fontSize(16)
      .fillColor(azul)
      .font('Helvetica-Bold')
      .text(titularNombre.toUpperCase(), 60, y, { align: 'center' });

    y += 22;
    doc
      .fontSize(9)
      .fillColor('#374151')
      .font('Helvetica')
      .text(`Documento: ${documento}`, 60, y, { align: 'center' });

    y += 20;
    // Detalle según tipo
    if (datos.tipo === 'NATURAL') {
      const partes: string[] = [];
      if (datos.detalle.profesion) partes.push(`Profesión: ${datos.detalle.profesion}`);
      if (datos.detalle.matricula) partes.push(`Matrícula: ${datos.detalle.matricula}`);
      if (datos.detalle.especialidad) partes.push(`Especialidad: ${datos.detalle.especialidad}`);
      const texto = partes.length ? partes.join('  •  ') : 'Registro Profesional — Persona Natural';
      doc.fontSize(9).fillColor('#374151').font('Helvetica').text(texto, 60, y, { align: 'center', width: doc.page.width - 200 });
      y += 20;
    } else {
      const partes: string[] = [];
      if (datos.detalle.representanteLegal) partes.push(`Rep. Legal: ${datos.detalle.representanteLegal}`);
      if (datos.detalle.actividadEconomica) partes.push(`Actividad: ${datos.detalle.actividadEconomica}`);
      const texto = partes.length ? partes.join('  •  ') : 'Registro Profesional — Persona Jurídica';
      doc.fontSize(9).fillColor('#374151').font('Helvetica').text(texto, 60, y, { align: 'center', width: doc.page.width - 200 });
      y += 20;
    }

    doc
      .fontSize(9)
      .fillColor('#4b5563')
      .font('Helvetica-Oblique')
      .text(
        'Ha cumplido con los requisitos establecidos por la Dirección Nacional de Bomberos para el ejercicio profesional.',
        60,
        y,
        { align: 'center', width: doc.page.width - 120 },
      );

    // Footer datos
    const footerY = doc.page.height - 95;
    doc
      .fontSize(7)
      .fillColor('#6b7280')
      .font('Helvetica')
      .text(`Código: ${datos.codigoCertificado}`, 40, footerY);
    doc.text(`Emisión: ${this.formatearFecha(datos.fechaEmision)}`, 40, footerY + 10);
    doc.text(`Vigencia: ${this.formatearFecha(datos.fechaVigencia)} (2 años)`, 40, footerY + 20);
    doc
      .fontSize(6)
      .fillColor('#9ca3af')
      .text(`Validar en: ${urlValidacion}`, 40, footerY + 32, { width: 400 });

    // QR a la derecha
    const qrBuffer = Buffer.from(qrBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
    const qrSize = 90;
    const qrX = doc.page.width - 40 - qrSize - 20;
    const qrY = footerY - 10;
    try {
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      doc
        .fontSize(6)
        .fillColor('#6b7280')
        .font('Helvetica')
        .text('Escanee para validar', qrX, qrY + qrSize + 4, { width: qrSize, align: 'center' });
    } catch (e) {
      this.logger.warn(`No se pudo incrustar QR: ${e}`);
    }

    // Firma simulada
    doc
      .moveTo(320, footerY + 5)
      .lineTo(500, footerY + 5)
      .lineWidth(0.5)
      .strokeColor('#9ca3af')
      .stroke();
    doc
      .fontSize(7)
      .fillColor('#374151')
      .font('Helvetica')
      .text('Dirección Nacional de Bomberos', 320, footerY + 10, { width: 180, align: 'center' });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    this.logger.log(`PDF generado: ${rutaRelativa}`);
    return { rutaArchivo: rutaRelativa, qrBase64 };
  }

  async generarCertificadoCapacitacion(datos: {
    codigoCertificado: string;
    participante: { nombre: string; ci: string; email?: string };
    curso: {
      nombre: string;
      descripcion?: string;
      duracionHoras?: number;
      modalidad?: string;
    };
    programacion: { fechaInicio: Date; lugar?: string | null };
    instructor?: { nombre: string; apellido?: string | null };
    fechaEmision: Date;
    fechaVigencia: Date;
  }): Promise<{ rutaArchivo: string; qrBase64: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const urlValidacion = `${frontendUrl}/validar-certificado-capacitacion/${datos.codigoCertificado}`;

    const qrBase64 = await QRCode.toDataURL(urlValidacion, {
      width: 180,
      margin: 1,
      color: { dark: '#0f1f3c', light: '#ffffff' },
    });

    const dir = path.join(process.cwd(), 'uploads', 'certificados');
    fs.mkdirSync(dir, { recursive: true });
    const rutaArchivo = path.join(dir, `${datos.codigoCertificado}.pdf`);
    const rutaRelativa = path.join(
      'uploads',
      'certificados',
      `${datos.codigoCertificado}.pdf`,
    );

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    const stream = fs.createWriteStream(rutaArchivo);
    doc.pipe(stream);

    const rojo = '#c8102e';
    const azul = '#0f1f3c';

    // Borde institucional
    doc
      .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(2)
      .strokeColor(azul)
      .stroke();
    doc
      .rect(24, 24, doc.page.width - 48, doc.page.height - 48)
      .lineWidth(0.5)
      .strokeColor(rojo)
      .stroke();

    // Header
    doc
      .fontSize(10)
      .fillColor(azul)
      .font('Helvetica-Bold')
      .text('DIRECCION NACIONAL DE BOMBEROS', 40, 38, { align: 'center' });
    doc
      .fontSize(8)
      .fillColor(rojo)
      .font('Helvetica')
      .text(
        'SISTEMA DE PREVENCION Y PROTECCION CONTRA INCENDIOS — SIPPCI',
        40,
        52,
        { align: 'center' },
      );

    // Titulo
    doc
      .fontSize(22)
      .fillColor(azul)
      .font('Helvetica-Bold')
      .text('CERTIFICADO DE CAPACITACIÓN', 40, 80, { align: 'center' });

    doc
      .fontSize(11)
      .fillColor(rojo)
      .font('Helvetica')
      .text(datos.curso.nombre.toUpperCase(), 40, 108, {
        align: 'center',
        width: doc.page.width - 80,
        ellipsis: true,
      });

    doc
      .moveTo(280, 130)
      .lineTo(doc.page.width - 280, 130)
      .lineWidth(1.5)
      .strokeColor(rojo)
      .stroke();

    // Cuerpo
    let y = 150;
    doc
      .fontSize(11)
      .fillColor('#111827')
      .font('Helvetica')
      .text('Se certifica que:', 60, y, { align: 'center', width: doc.page.width - 120 });

    y += 20;
    doc
      .fontSize(16)
      .fillColor(azul)
      .font('Helvetica-Bold')
      .text(datos.participante.nombre.toUpperCase(), 60, y, {
        align: 'center',
        width: doc.page.width - 120,
      });

    y += 24;
    doc
      .fontSize(9)
      .fillColor('#374151')
      .font('Helvetica')
      .text(`Documento: CI ${datos.participante.ci}`, 60, y, {
        align: 'center',
        width: doc.page.width - 120,
      });

    y += 22;
    doc
      .fontSize(11)
      .fillColor('#111827')
      .font('Helvetica')
      .text('Ha completado satisfactoriamente el curso:', 60, y, {
        align: 'center',
        width: doc.page.width - 120,
      });

    const horas = datos.curso.duracionHoras
      ? `${datos.curso.duracionHoras} horas`
      : undefined;
    const detalle = [horas, datos.curso.modalidad].filter(Boolean).join(', ');
    const cursoLinea = detalle
      ? `${datos.curso.nombre} (${detalle})`
      : datos.curso.nombre;

    y += 20;
    doc
      .fontSize(13)
      .fillColor(azul)
      .font('Helvetica-Bold')
      .text(cursoLinea, 60, y, {
        align: 'center',
        width: doc.page.width - 120,
      });

    const fechaDictado = this.formatearFecha(datos.programacion.fechaInicio);
    const dictado = datos.programacion.lugar
      ? `Dictado el ${fechaDictado} en ${datos.programacion.lugar}`
      : `Dictado el ${fechaDictado}`;

    y += 22;
    doc
      .fontSize(9)
      .fillColor('#374151')
      .font('Helvetica')
      .text(dictado, 60, y, { align: 'center', width: doc.page.width - 120 });

    const nombreInstructor = datos.instructor
      ? `${datos.instructor.nombre} ${datos.instructor.apellido ?? ''}`.trim()
      : undefined;

    if (nombreInstructor) {
      y += 16;
      doc
        .fontSize(9)
        .fillColor('#374151')
        .font('Helvetica')
        .text(`Instructor: ${nombreInstructor}`, 60, y, {
          align: 'center',
          width: doc.page.width - 120,
        });
    }

    y += 20;
    doc
      .fontSize(9)
      .fillColor('#4b5563')
      .font('Helvetica-Oblique')
      .text(
        'Ha cumplido con los requisitos establecidos por la Dirección Nacional de Bomberos.',
        60,
        y,
        { align: 'center', width: doc.page.width - 120 },
      );

    // Footer
    const footerY = doc.page.height - 95;
    doc
      .fontSize(7)
      .fillColor('#6b7280')
      .font('Helvetica')
      .text(`Código: ${datos.codigoCertificado}`, 40, footerY);
    doc.text(`Emisión: ${this.formatearFecha(datos.fechaEmision)}`, 40, footerY + 10);
    doc.text(
      `Vigencia: ${this.formatearFecha(datos.fechaVigencia)} (2 años)`,
      40,
      footerY + 20,
    );
    doc
      .fontSize(6)
      .fillColor('#9ca3af')
      .text(`Validar en: ${urlValidacion}`, 40, footerY + 32, { width: 400 });

    // QR
    const qrBuffer = Buffer.from(
      qrBase64.replace(/^data:image\/png;base64,/, ''),
      'base64',
    );
    const qrSize = 90;
    const qrX = doc.page.width - 40 - qrSize - 20;
    const qrY = footerY - 10;
    try {
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      doc
        .fontSize(6)
        .fillColor('#6b7280')
        .font('Helvetica')
        .text('Escanee para validar', qrX, qrY + qrSize + 4, {
          width: qrSize,
          align: 'center',
        });
    } catch (e) {
      this.logger.warn(`No se pudo incrustar QR: ${e}`);
    }

    // Firma simulada
    doc
      .moveTo(320, footerY + 5)
      .lineTo(500, footerY + 5)
      .lineWidth(0.5)
      .strokeColor('#9ca3af')
      .stroke();
    doc
      .fontSize(7)
      .fillColor('#374151')
      .font('Helvetica')
      .text('Dirección Nacional de Bomberos', 320, footerY + 10, {
        width: 180,
        align: 'center',
      });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    this.logger.log(`PDF de capacitación generado: ${rutaRelativa}`);
    return { rutaArchivo: rutaRelativa, qrBase64 };
  }

  private formatearFecha(d: Date): string {
    return d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
