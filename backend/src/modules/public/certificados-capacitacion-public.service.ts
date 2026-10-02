import { Injectable } from '@nestjs/common';
import { EstadoCertificadoCapacitacion } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CertificadosCapacitacionPublicService {
  constructor(private prisma: PrismaService) {}

  async validar(codigo: string) {
    const cert = await this.prisma.certificado_capacitacion.findUnique({
      where: { codigo },
      include: {
        curso: true,
        instructor: true,
        participanteProgramacion: {
          include: {
            participante: true,
            programacion: true,
          },
        },
      },
    });

    if (!cert) {
      return { valido: false, mensaje: 'Certificado no encontrado' };
    }

    const inscripcion = cert.participanteProgramacion[0];
    const hoy = new Date();
    const vencido =
      cert.vigenciaHasta < hoy ||
      cert.estado !== EstadoCertificadoCapacitacion.EMITIDO;

    return {
      valido: true,
      vencido,
      codigo: cert.codigo,
      participante: inscripcion
        ? { nombre: inscripcion.participante.nombre, ci: inscripcion.participante.ci }
        : null,
      curso: {
        nombre: cert.curso.nombre,
        duracionHoras: cert.curso.duracionHoras,
        modalidad: cert.curso.modalidad,
      },
      programacion: inscripcion
        ? {
            fechaInicio: inscripcion.programacion.fechaInicio,
            lugar: inscripcion.programacion.lugar,
          }
        : null,
      instructor: cert.instructor
        ? { nombre: cert.instructor.nombre, apellido: cert.instructor.apellido }
        : null,
      fechaEmision: cert.emitidoEn,
      fechaVigencia: cert.vigenciaHasta,
      estado: cert.estado,
      mensaje: vencido ? 'Certificado vencido' : 'Certificado válido',
    };
  }
}
