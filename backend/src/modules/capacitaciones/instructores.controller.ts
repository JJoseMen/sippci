import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InstructoresService } from './instructores.service';
import { CrearInstructorDto } from './dto/crear-instructor.dto';
import { ActualizarInstructorDto } from './dto/actualizar-instructor.dto';
import { QueryInstructorDto } from './dto/query-instructor.dto';

@ApiTags('Instructores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTOR_CAPACITACIONES')
@Controller('admin/sippci/capacitaciones/instructores')
export class InstructoresController {
  constructor(private instructoresService: InstructoresService) {}

  @Get()
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Listar instructores con paginacion y filtros' })
  async listar(@Query() query: QueryInstructorDto) {
    return this.instructoresService.listarInstructores(query);
  }

  @Get(':id')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Obtener un instructor por id' })
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return this.instructoresService.obtenerInstructor(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear instructor' })
  async crear(@Body() dto: CrearInstructorDto) {
    return this.instructoresService.crearInstructor(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar instructor' })
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarInstructorDto) {
    return this.instructoresService.actualizarInstructor(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar instructor (soft delete)' })
  async desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.instructoresService.desactivarInstructor(id);
  }
}
