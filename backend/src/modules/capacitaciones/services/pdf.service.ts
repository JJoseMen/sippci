import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';

export interface DatosFormulario {
  subCodigo: string;
  nombreCompleto: string;
  carnet: string;
  expedido: string;
  email?: string;
  telefono?: string;
  esRepresentante: boolean;
  representante: string;
  cursos: { nombre: string; costo: number }[];
}

export interface DatosCertificado {
  codigoCertificado: string;
  subCodigo: string;
  nombreCompleto: string;
  carnet: string;
  fechaEmision: Date;
  instructor: string;
  calificacion: string;
  cursos: string[];
  solicitudCodigo: string;
}

@Injectable()
export class PdfService {
  generarFormulario(d: DatosFormulario): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const fin = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(14).text('DIRECCION NACIONAL DE BOMBEROS', { align: 'center' });
    doc.fontSize(10).text('POLICIA BOLIVIANA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(13).text('FORMULARIO DE INSCRIPCION A CAPACITACION', {
      align: 'center',
      underline: true,
    });
    doc.moveDown(0.75);

    doc.fontSize(11).text(`Sub-codigo: ${d.subCodigo}`);
    doc.text(`Codigo de representante: ${d.representante}`);
    doc.moveDown(0.5);

    doc.fontSize(12).text('1. DATOS DEL PARTICIPANTE', { underline: true });
    doc.fontSize(10);
    doc.text(`Nombre completo: ${d.nombreCompleto}`);
    doc.text(`Carnet: ${d.carnet} (${d.expedido})`);
    doc.text(`Email: ${d.email || '-'}`);
    doc.text(`Telefono: ${d.telefono || '-'}`);
    doc.text(`Es representante: ${d.esRepresentante ? 'SI' : 'NO'}`);
    doc.moveDown(0.5);

    doc.fontSize(12).text('2. CURSOS', { underline: true });
    doc.fontSize(10);
    d.cursos.forEach((c) => doc.text(`- ${c.nombre} (Bs ${c.costo})`));
    doc.moveDown(0.5);

    doc.fontSize(12).text('3. DATOS DEL REPRESENTANTE', { underline: true });
    doc.fontSize(10);
    doc.text(`Representante legal: ${d.representante}`);
    doc.moveDown(0.75);

    doc.fontSize(10).text('Firma del participante: ______________________', {
      align: 'center',
    });
    doc.moveDown(0.25);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-BO')}`, { align: 'center' });

    doc.end();
    return fin;
  }

  async generarCertificado(d: DatosCertificado): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const fin = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(14).text('DIRECCION NACIONAL DE BOMBEROS', { align: 'center' });
    doc.fontSize(10).text('POLICIA BOLIVIANA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text('CERTIFICADO DE CAPACITACION', {
      align: 'center',
      underline: true,
    });
    doc.moveDown(0.75);

    doc.fontSize(11).text(`Codigo de certificado: ${d.codigoCertificado}`);
    doc.text(`Sub-codigo: ${d.subCodigo}`);
    doc.text(`Codigo de solicitud: ${d.solicitudCodigo}`);
    doc.moveDown(0.5);

    doc.fontSize(11).text(
      `Se certifica que ${d.nombreCompleto}, portador del carnet de identidad ${d.carnet}, ha aprobado satisfactoriamente el/los siguiente(s) curso(s) de capacitacion:`,
      { align: 'justify' },
    );
    doc.moveDown(0.25);
    d.cursos.forEach((c) => doc.text(`- ${c}`));
    doc.moveDown(0.25);
    doc.text(`Calificacion: ${d.calificacion}`);
    doc.text(`Instructor: ${d.instructor}`);
    doc.moveDown(0.5);
    doc.text(`Fecha de emision: ${d.fechaEmision.toLocaleDateString('es-BO')}`, {
      align: 'center',
    });

    const qrData = `CERTIFICADO|${d.codigoCertificado}|${d.subCodigo}|${d.nombreCompleto}`;
    const qrUrl = await QRCode.toDataURL(qrData);
    const qrBuf = Buffer.from(qrUrl.split(',')[1], 'base64');
    doc.image(qrBuf, 50, doc.y, { width: 70, height: 70 });
    doc.text('Escanee para verificar', 125, doc.y + 55);

    doc.end();
    return fin;
  }
}