import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoProgramacion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearProgramacionDto } from './dto/crear-programacion.dto';
import { ActualizarProgramacionDto } from './dto/actualizar-programacion.dto';
import { QueryProgramacionDto } from './dto/query-programacion.dto';
import { ReprogramarProgramacionDto } from './dto/reprogramar-programacion.dto';
import { InscribirParticipanteDto } from './dto/inscribir-participante.dto';
import { ActualizarEstadoParticipanteDto } from './dto/actualizar-estado-participante.dto';
import { QueryParticipanteProgramacionDto } from './dto/query-participante-programacion.dto';

const TRANSICIONES: Record<EstadoProgramacion, EstadoProgramacion[]> = {
  [EstadoProgramacion.PROGRAMADO]: [
    EstadoProgramacion.EN_CURSO,
    EstadoProgramacion.REPROGRAMADO,
    EstadoProgramacion.CANCELADO,
  ],
  [EstadoProgramacion.EN_CURSO]: [
    EstadoProgramacion.FINALIZADO,
    EstadoProgramacion.CANCELADO,
  ],
  [EstadoProgramacion.FINALIZADO]: [],
  [EstadoProgramacion.REPROGRAMADO]: [
    EstadoProgramacion.PROGRAMADO,
    EstadoProgramacion.CANCELADO,
  ],
  [EstadoProgramacion.CANCELADO]: [],
};

const INCLUDE_COMPLETO: Prisma.programacion_cursoInclude = {
  curso: true,
  instructor: true,
  _count: { select: { participantes: true } },
};

const INCLUDE_BASE: Prisma.programacion_cursoInclude = {
  curso: true,
  instructor: true,
};

const INCLUDE_INSCRIPCION: Prisma.participante_programacionInclude = {
  participante: true,
};

const ESTADOS_APTOS_INSCRIPCION: EstadoProgramacion[] = [
  EstadoProgramacion.PROGRAMADO,
  EstadoProgramacion.REPROGRAMADO,
];

@Injectable()
export class ProgramacionesService {
  constructor(private prisma: PrismaService) {}

  async listar(query: QueryProgramacionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.programacion_cursoWhereInput = {};

    if (query.search) {
      where.OR = [
        { lugar: { contains: query.search, mode: 'insensitive' } },
        { observaciones: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.cursoId !== undefined) where.cursoId = query.cursoId;
    if (query.instructorId !== undefined) where.instructorId = query.instructorId;
    if (query.estado) where.estado = query.estado;
    if (query.desde || query.hasta) {
      where.fechaInicio = {
        gte: query.desde ? new Date(query.desde) : undefined,
        lte: query.hasta ? new Date(query.hasta) : undefined,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.programacion_curso.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ fechaInicio: 'desc' }],
        include: INCLUDE_COMPLETO,
      }),
      this.prisma.programacion_curso.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async obtener(id: number) {
    const programacion = await this.prisma.programacion_curso.findUnique({
      where: { id },
      include: INCLUDE_COMPLETO,
    });
    if (!programacion) throw new NotFoundException('Programación no encontrada');
    return programacion;
  }

  async crear(dto: CrearProgramacionDto) {
    const curso = await this.prisma.cursos.findUnique({
      where: { id: dto.cursoId },
    });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    if (dto.instructorId !== undefined) {
      await this.validarInstructor(dto.instructorId, true);
    }

    this.validarFechas(dto.fechaInicio, dto.fechaFin);

    return this.prisma.programacion_curso.create({
      data: {
        cursoId: dto.cursoId,
        instructorId: dto.instructorId,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
        lugar: dto.lugar,
        cupo: dto.cupo,
        observaciones: dto.observaciones,
        estado: EstadoProgramacion.PROGRAMADO,
      },
      include: INCLUDE_BASE,
    });
  }

  async actualizar(id: number, dto: ActualizarProgramacionDto) {
    const existente = await this.prisma.programacion_curso.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundException('Programación no encontrada');

    if (existente.estado === EstadoProgramacion.FINALIZADO ||
        existente.estado === EstadoProgramacion.CANCELADO) {
      throw new BadRequestException(
        `No se puede editar una programación en estado ${existente.estado}`,
      );
    }

    if (dto.cursoId !== undefined) {
      const curso = await this.prisma.cursos.findUnique({
        where: { id: dto.cursoId },
      });
      if (!curso) throw new NotFoundException('Curso no encontrado');
    }

    if (dto.instructorId !== undefined) {
      await this.validarInstructor(dto.instructorId, false);
    }

    const fechaInicio = dto.fechaInicio ?? existente.fechaInicio;
    const fechaFin =
      dto.fechaFin !== undefined
        ? dto.fechaFin
          ? new Date(dto.fechaFin)
          : null
        : existente.fechaFin;
    this.validarFechas(fechaInicio, fechaFin);

    return this.prisma.programacion_curso.update({
      where: { id },
      data: {
        cursoId: dto.cursoId,
        instructorId: dto.instructorId,
        fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : undefined,
        fechaFin: dto.fechaFin !== undefined
          ? dto.fechaFin
            ? new Date(dto.fechaFin)
            : null
          : undefined,
        lugar: dto.lugar,
        cupo: dto.cupo,
        observaciones: dto.observaciones,
      },
      include: INCLUDE_BASE,
    });
  }

  async reprogramar(id: number, dto: ReprogramarProgramacionDto) {
    const existente = await this.prisma.programacion_curso.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundException('Programación no encontrada');

    this.validarTransicion(existente.estado, EstadoProgramacion.REPROGRAMADO);
    this.validarFechas(dto.fechaInicio, dto.fechaFin);

    return this.prisma.programacion_curso.update({
      where: { id },
      data: {
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
        observaciones:
          dto.observaciones !== undefined
            ? dto.observaciones
            : undefined,
        estado: EstadoProgramacion.REPROGRAMADO,
      },
      include: INCLUDE_BASE,
    });
  }

  async cancelar(id: number) {
    const existente = await this.prisma.programacion_curso.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundException('Programación no encontrada');

    this.validarTransicion(existente.estado, EstadoProgramacion.CANCELADO);

    const programacion = await this.prisma.programacion_curso.update({
      where: { id },
      data: { estado: EstadoProgramacion.CANCELADO },
      include: INCLUDE_BASE,
    });

    return { message: 'Programación cancelada', programacion };
  }

  async iniciar(id: number) {
    return this.transicionar(id, EstadoProgramacion.EN_CURSO);
  }

  async finalizar(id: number) {
    return this.transicionar(id, EstadoProgramacion.FINALIZADO);
  }

  // ============================================================
  // PARTICIPANTES DE LA PROGRAMACION
  // ============================================================

  async listarParticipantes(
    programacionId: number,
    query: QueryParticipanteProgramacionDto,
  ) {
    await this.obtener(programacionId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.participante_programacionWhereInput = {
      programacionId,
    };

    const whereParticipante: Prisma.participantes_capacitacionWhereInput = {};
    if (query.search) {
      whereParticipante.OR = [
        { nombre: { contains: query.search, mode: 'insensitive' } },
        { ci: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.estado) whereParticipante.estado = query.estado;
    if (Object.keys(whereParticipante).length > 0) {
      where.participante = whereParticipante;
    }

    if (query.asistencia !== undefined) where.asistencia = query.asistencia;
    if (query.aprobado !== undefined) where.aprobado = query.aprobado;

    const [items, total] = await Promise.all([
      this.prisma.participante_programacion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: INCLUDE_INSCRIPCION,
      }),
      this.prisma.participante_programacion.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async inscribirParticipante(
    programacionId: number,
    dto: InscribirParticipanteDto,
  ) {
    const programacion = await this.obtener(programacionId);

    if (!ESTADOS_APTOS_INSCRIPCION.includes(programacion.estado)) {
      throw new BadRequestException(
        `No se pueden inscribir participantes en una programación en estado ${programacion.estado}. ` +
          `Estados aptos: [${ESTADOS_APTOS_INSCRIPCION.join(', ')}]`,
      );
    }

    const participante =
      await this.prisma.participantes_capacitacion.findUnique({
        where: { id: dto.participanteId },
      });
    if (!participante) throw new NotFoundException('Participante no encontrado');

    const duplicado = await this.prisma.participante_programacion.findUnique({
      where: {
        programacionId_participanteId: {
          programacionId,
          participanteId: dto.participanteId,
        },
      },
    });
    if (duplicado) {
      throw new ConflictException(
        'El participante ya está inscrito en esta programación',
      );
    }

    const inscritos = programacion._count?.participantes ?? 0;
    if (programacion.cupo !== null && inscritos >= programacion.cupo) {
      throw new BadRequestException(
        `Cupo completo: ${inscritos}/${programacion.cupo} inscritos`,
      );
    }

    return this.prisma.participante_programacion.create({
      data: { programacionId, participanteId: dto.participanteId },
      include: INCLUDE_INSCRIPCION,
    });
  }

  async desinscribirParticipante(
    programacionId: number,
    participanteId: number,
  ) {
    const programacion = await this.obtener(programacionId);

    if (
      programacion.estado === EstadoProgramacion.FINALIZADO ||
      programacion.estado === EstadoProgramacion.CANCELADO
    ) {
      throw new BadRequestException(
        `No se puede modificar una programación en estado ${programacion.estado}`,
      );
    }

    const inscripcion = await this.prisma.participante_programacion.findUnique({
      where: {
        programacionId_participanteId: { programacionId, participanteId },
      },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    if (inscripcion.certificadoId !== null) {
      throw new BadRequestException(
        'No se puede desinscribir un participante con certificado emitido',
      );
    }

    await this.prisma.participante_programacion.delete({
      where: { id: inscripcion.id },
    });

    return { message: 'Participante desinscrito', participanteId };
  }

  async actualizarEstadoParticipante(
    programacionId: number,
    participanteId: number,
    dto: ActualizarEstadoParticipanteDto,
  ) {
    await this.obtener(programacionId);

    const inscripcion = await this.prisma.participante_programacion.findUnique({
      where: {
        programacionId_participanteId: { programacionId, participanteId },
      },
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    const hayCambios =
      dto.estado !== undefined ||
      dto.asistencia !== undefined ||
      dto.aprobado !== undefined ||
      dto.puntaje !== undefined ||
      dto.observaciones !== undefined;
    if (!hayCambios) {
      throw new BadRequestException(
        'Debe indicar al menos un campo a actualizar',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.estado !== undefined) {
        await tx.participantes_capacitacion.update({
          where: { id: participanteId },
          data: { estado: dto.estado },
        });
      }

      return tx.participante_programacion.update({
        where: { id: inscripcion.id },
        data: {
          asistencia: dto.asistencia,
          aprobado: dto.aprobado,
          puntaje: dto.puntaje,
          observaciones: dto.observaciones,
        },
        include: INCLUDE_INSCRIPCION,
      });
    });
  }

  private async transicionar(id: number, nuevo: EstadoProgramacion) {
    const existente = await this.prisma.programacion_curso.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundException('Programación no encontrada');

    this.validarTransicion(existente.estado, nuevo);

    return this.prisma.programacion_curso.update({
      where: { id },
      data: { estado: nuevo },
      include: INCLUDE_BASE,
    });
  }

  private validarTransicion(
    actual: EstadoProgramacion,
    nuevo: EstadoProgramacion,
  ): void {
    const permitidos = TRANSICIONES[actual] ?? [];
    if (!permitidos.includes(nuevo)) {
      throw new BadRequestException(
        `Transición inválida: ${actual} → ${nuevo}. ` +
          (permitidos.length
            ? `Estados permitidos: [${permitidos.join(', ')}]`
            : `${actual} es un estado de solo lectura`),
      );
    }
  }

  private validarFechas(
    fechaInicio: string | Date,
    fechaFin?: string | Date | null,
  ): void {
    if (!fechaFin) return;

    const inicio = new Date(fechaInicio).getTime();
    const fin = new Date(fechaFin).getTime();

    if (Number.isNaN(inicio) || Number.isNaN(fin)) {
      throw new BadRequestException('Fechas inválidas');
    }
    if (fin <= inicio) {
      throw new BadRequestException('fechaFin debe ser posterior a fechaInicio');
    }
  }

  private async validarInstructor(id: number, exigirActivo: boolean) {
    const instructor = await this.prisma.instructores.findUnique({
      where: { id },
    });
    if (!instructor) throw new NotFoundException('Instructor no encontrado');
    if (exigirActivo && !instructor.activo) {
      throw new NotFoundException('Instructor inactivo');
    }
    return instructor;
  }
}
