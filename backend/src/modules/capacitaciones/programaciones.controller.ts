import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProgramacionesService } from './programaciones.service';
import { CrearProgramacionDto } from './dto/crear-programacion.dto';
import { ActualizarProgramacionDto } from './dto/actualizar-programacion.dto';
import { QueryProgramacionDto } from './dto/query-programacion.dto';
import { ReprogramarProgramacionDto } from './dto/reprogramar-programacion.dto';
import { InscribirParticipanteDto } from './dto/inscribir-participante.dto';
import { ActualizarEstadoParticipanteDto } from './dto/actualizar-estado-participante.dto';
import { QueryParticipanteProgramacionDto } from './dto/query-participante-programacion.dto';

@ApiTags('Programaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTOR_CAPACITACIONES')
@Controller('admin/sippci/capacitaciones/programaciones')
export class ProgramacionesController {
  constructor(private programacionesService: ProgramacionesService) {}

  @Get()
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Listar programaciones con paginacion y filtros' })
  async listar(@Query() query: QueryProgramacionDto) {
    return this.programacionesService.listar(query);
  }

  @Get(':id')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Obtener una programacion por id' })
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return this.programacionesService.obtener(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear programacion' })
  async crear(@Body() dto: CrearProgramacionDto) {
    return this.programacionesService.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar programacion' })
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarProgramacionDto,
  ) {
    return this.programacionesService.actualizar(id, dto);
  }

  @Put(':id/reprogramar')
  @ApiOperation({ summary: 'Reprogramar: cambia fechas y estado a REPROGRAMADO' })
  async reprogramar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReprogramarProgramacionDto,
  ) {
    return this.programacionesService.reprogramar(id, dto);
  }

  @Put(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar programacion (transicion a CANCELADO)' })
  async cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.programacionesService.cancelar(id);
  }

  @Put(':id/iniciar')
  @ApiOperation({ summary: 'Iniciar programacion (PROGRAMADO a EN_CURSO)' })
  async iniciar(@Param('id', ParseIntPipe) id: number) {
    return this.programacionesService.iniciar(id);
  }

  @Put(':id/finalizar')
  @ApiOperation({ summary: 'Finalizar programacion (EN_CURSO a FINALIZADO)' })
  async finalizar(@Param('id', ParseIntPipe) id: number) {
    return this.programacionesService.finalizar(id);
  }

  // ------------------------------------------------------------
  // PARTICIPANTES DE LA PROGRAMACION
  // ------------------------------------------------------------

  @Get(':id/participantes')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Listar participantes inscritos en una programacion' })
  async listarParticipantes(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryParticipanteProgramacionDto,
  ) {
    return this.programacionesService.listarParticipantes(id, query);
  }

  @Post(':id/participantes')
  @ApiOperation({ summary: 'Inscribir participante en una programacion' })
  async inscribirParticipante(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InscribirParticipanteDto,
  ) {
    return this.programacionesService.inscribirParticipante(id, dto);
  }

  @Put(':id/participantes/:participanteId/estado')
  @ApiOperation({
    summary: 'Actualizar asistencia, calificacion o estado del participante',
  })
  async actualizarEstadoParticipante(
    @Param('id', ParseIntPipe) id: number,
    @Param('participanteId', ParseIntPipe) participanteId: number,
    @Body() dto: ActualizarEstadoParticipanteDto,
  ) {
    return this.programacionesService.actualizarEstadoParticipante(
      id,
      participanteId,
      dto,
    );
  }

  @Delete(':id/participantes/:participanteId')
  @ApiOperation({ summary: 'Desinscribir participante de la programacion' })
  async desinscribirParticipante(
    @Param('id', ParseIntPipe) id: number,
    @Param('participanteId', ParseIntPipe) participanteId: number,
  ) {
    return this.programacionesService.desinscribirParticipante(
      id,
      participanteId,
    );
  }
}
