import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearInstructorDto } from './dto/crear-instructor.dto';
import { ActualizarInstructorDto } from './dto/actualizar-instructor.dto';
import { QueryInstructorDto } from './dto/query-instructor.dto';

@Injectable()
export class InstructoresService {
  constructor(private prisma: PrismaService) {}

  async listarInstructores(query: QueryInstructorDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.instructoresWhereInput = {};
    if (query.search) {
      where.OR = [
        { nombre: { contains: query.search, mode: 'insensitive' } },
        { apellido: { contains: query.search, mode: 'insensitive' } },
        { ci: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.activo !== undefined) where.activo = query.activo;

    const [items, total] = await Promise.all([
      this.prisma.instructores.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
      }),
      this.prisma.instructores.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async obtenerInstructor(id: number) {
    const instructor = await this.prisma.instructores.findUnique({ where: { id } });
    if (!instructor) throw new NotFoundException('Instructor no encontrado');
    return instructor;
  }

  async crearInstructor(dto: CrearInstructorDto) {
    const duplicado = await this.prisma.instructores.findUnique({
      where: { ci: dto.ci },
    });
    if (duplicado) {
      throw new ConflictException(`Ya existe un instructor con CI ${dto.ci}`);
    }

    return this.prisma.instructores.create({ data: { ...dto } });
  }

  async actualizarInstructor(id: number, dto: ActualizarInstructorDto) {
    const existente = await this.prisma.instructores.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Instructor no encontrado');

    if (dto.ci !== undefined && dto.ci !== existente.ci) {
      const duplicado = await this.prisma.instructores.findUnique({
        where: { ci: dto.ci },
      });
      if (duplicado) {
        throw new ConflictException(`Ya existe un instructor con CI ${dto.ci}`);
      }
    }

    return this.prisma.instructores.update({ where: { id }, data: { ...dto } });
  }

  async desactivarInstructor(id: number) {
    const instructor = await this.prisma.instructores.findUnique({ where: { id } });
    if (!instructor) throw new NotFoundException('Instructor no encontrado');

    const actualizado = await this.prisma.instructores.update({
      where: { id },
      data: { activo: false },
    });

    return { message: 'Instructor desactivado', instructor: actualizado };
  }
}
