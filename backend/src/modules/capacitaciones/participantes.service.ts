import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearParticipanteCapacitacionDto } from './dto/crear-participante-capacitacion.dto';
import { QueryParticipanteCapacitacionDto } from './dto/query-participante-capacitacion.dto';

@Injectable()
export class ParticipantesService {
  constructor(private prisma: PrismaService) {}

  async listarParticipantes(query: QueryParticipanteCapacitacionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.participantes_capacitacionWhereInput = {};
    if (query.search) {
      where.OR = [
        { nombre: { contains: query.search, mode: 'insensitive' } },
        { ci: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.estado) where.estado = query.estado;

    const [items, total] = await Promise.all([
      this.prisma.participantes_capacitacion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.participantes_capacitacion.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async crearParticipante(dto: CrearParticipanteCapacitacionDto) {
    const duplicado = await this.prisma.participantes_capacitacion.findFirst({
      where: { ci: dto.ci },
    });
    if (duplicado) {
      throw new ConflictException(
        `Ya existe un participante con CI ${dto.ci} (${duplicado.nombre})`,
      );
    }

    return this.prisma.participantes_capacitacion.create({ data: { ...dto } });
  }
}
