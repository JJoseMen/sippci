import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoParticipante } from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { ExcelService } from './services/excel.service';
import { PdfService } from './services/pdf.service';
import {
  CapacitacionesService,
  ParticipanteCompleto,
} from './capacitaciones.service';
import { generarCodigoSubparticipante } from '../../common/utils/codigo.util';
import { calcularHashSha256 } from '../../common/utils/hash.util';

const CAP_DIR = join(process.cwd(), 'uploads', 'capacitaciones');

@Injectable()
export class RegistroCapacitacionesService {
  constructor(
    private prisma: PrismaService,
    private excelService: ExcelService,
    private pdfService: PdfService,
    private capacitaciones: CapacitacionesService,
  ) {}

  async descargarPlantilla() {
    return {
      buffer: this.excelService.generarPlantilla(),
      nombre: 'plantilla_participantes_capacitacion.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async subirLista(codigoSolicitud: string, file: any, usuarioId: number) {
    const sol = await this.capacitaciones.validarCapacitacion(codigoSolicitud, usuarioId);
    if (sol.estado !== 'BORRADOR')
      throw new BadRequestException('Solo se pueden agregar participantes en BORRADOR');
    if (!file?.buffer) throw new BadRequestException('Archivo Excel requerido');

    const lista = this.excelService.parsearLista(file.buffer);
    const rep = this.repOf(sol.datosJson, sol.usuario?.nombre ?? 'SIN NOMBRE');
    const creados: ParticipanteCompleto[] = [];
    for (const item of lista) {
      creados.push(
        await this.crear(
          sol.id,
          {
            nombreCompleto: item.nombreCompleto,
            carnet: item.carnet,
            expedido: item.expedido,
            email: item.email,
            telefono: item.telefono,
          },
          item.cursos,
          rep,
        ),
      );
    }
    return { creados: creados.length, participantes: creados };
  }

  async agregarSolicitante(codigoSolicitud: string, usuarioId: number) {
    const sol = await this.capacitaciones.validarCapacitacion(codigoSolicitud, usuarioId);
    if (sol.estado !== 'BORRADOR')
      throw new BadRequestException('Solo se puede registrar en BORRADOR');

    const existente = await this.prisma.participantes_capacitacion.findFirst({
      where: { solicitudId: sol.id, esRepresentante: false },
    });
    if (existente) return { participante: existente };

    const cursos = await this.capacitaciones.obtenerCursosDeDatos(sol.datosJson);
    const p = await this.crear(
      sol.id,
      {
        nombreCompleto: this.repOf(sol.datosJson, sol.usuario?.nombre ?? 'SIN NOMBRE'),
        carnet: String(
          (sol.datosJson as Record<string, unknown>)?.ci ?? 'SIN CI',
        ),
        email: sol.usuario?.email ?? undefined,
        esRepresentante: false,
      },
      cursos,
      this.repOf(sol.datosJson, sol.usuario?.nombre ?? 'SIN NOMBRE'),
    );
    return { participante: p };
  }

  async agregarRepresentante(codigoSolicitud: string, esRepresentante: boolean, usuarioId: number) {
    const sol = await this.capacitaciones.validarCapacitacion(codigoSolicitud, usuarioId);
    if (sol.estado !== 'BORRADOR')
      throw new BadRequestException('Solo se puede agregar en BORRADOR');

    const existente = await this.prisma.participantes_capacitacion.findFirst({
      where: { solicitudId: sol.id, esRepresentante: true },
    });
    if (existente) {
      if (esRepresentante)
        return { message: 'El representante ya participa', participante: existente };
      await this.prisma.participantes_cursos.deleteMany({ where: { participanteId: existente.id } });
      await this.prisma.participantes_capacitacion.delete({ where: { id: existente.id } });
      return { message: 'Representante eliminado de participantes' };
    }
    if (!esRepresentante) return { message: 'Representante no participa' };

    const rep = this.repOf(sol.datosJson, sol.usuario?.nombre ?? 'SIN NOMBRE');
    const datos = (sol.datosJson ?? {}) as Record<string, unknown>;
    const p = await this.crear(
      sol.id,
      {
        nombreCompleto: rep,
        carnet: String(datos?.nit ?? datos?.ci ?? 'SIN CI'),
        email: sol.usuario?.email ?? undefined,
        esRepresentante: true,
      },
      await this.capacitaciones.obtenerCursosDeDatos(sol.datosJson),
      rep,
    );
    return { participante: p };
  }

  private repOf(d: unknown, fallback: string): string {
    const datos = (d ?? {}) as Record<string, unknown>;
    return String(datos?.nombrerz ?? datos?.nombreCompleto ?? fallback);
  }

  private async crear(
    solId: number,
    d: {
      nombreCompleto: string;
      carnet: string;
      expedido?: string;
      email?: string;
      telefono?: string;
      esRepresentante?: boolean;
    },
    cursos: string[],
    representante: string,
  ): Promise<ParticipanteCompleto> {
    const count = await this.prisma.participantes_capacitacion.count({
      where: { solicitudId: solId },
    });
    const subCodigo = generarCodigoSubparticipante(solId, count + 1);
    const creado = await this.prisma.participantes_capacitacion.create({
      data: {
        solicitudId: solId,
        nombre: d.nombreCompleto,
        ci: d.carnet,
        subCodigo,
        nombreCompleto: d.nombreCompleto,
        carnet: d.carnet,
        expedido: d.expedido ?? 'LP',
        email: d.email,
        telefono: d.telefono,
        esRepresentante: d.esRepresentante ?? false,
      },
    });
    const cursoRecords = await this.prisma.cursos.findMany({
      where: { nombre: { in: cursos }, activo: true },
    });
    if (cursoRecords.length !== cursos.length)
      throw new BadRequestException('Algunos cursos no son validos');
    for (const curso of cursoRecords) {
      await this.prisma.participantes_cursos.create({
        data: { participanteId: creado.id, cursoId: curso.id },
      });
    }
    const p = await this.capacitaciones.conCursosPorSubCodigo(subCodigo);
    await this.generarPdfFormulario(p, representante);
    return p;
  }

  private async generarPdfFormulario(p: ParticipanteCompleto, representante: string) {
    const buffer = await this.pdfService.generarFormulario({
      subCodigo: p.subCodigo,
      nombreCompleto: p.nombreCompleto,
      carnet: p.carnet,
      expedido: p.expedido,
      email: p.email ?? undefined,
      telefono: p.telefono ?? undefined,
      esRepresentante: p.esRepresentante,
      representante,
      cursos: p.relaciones.map((r) => ({
        nombre: r.curso.nombre,
        costo: Number(r.curso.costoBsf ?? 0),
      })),
    });
    const hash = calcularHashSha256(buffer);
    if (!existsSync(CAP_DIR)) await mkdir(CAP_DIR, { recursive: true });
    const ruta = join(CAP_DIR, `${p.subCodigo}_FORM.pdf`);
    await writeFile(ruta, buffer);
    return this.prisma.participantes_capacitacion.update({
      where: { id: p.id },
      data: {
        pdfFormularioRuta: ruta,
        pdfFormularioHash: hash,
        estado: EstadoParticipante.FORMULARIO_GENERADO,
      },
    });
  }
}