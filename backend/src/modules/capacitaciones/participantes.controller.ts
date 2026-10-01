import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParticipantesService } from './participantes.service';
import { CrearParticipanteCapacitacionDto } from './dto/crear-participante-capacitacion.dto';
import { QueryParticipanteCapacitacionDto } from './dto/query-participante-capacitacion.dto';

@ApiTags('Participantes (catalogo)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTOR_CAPACITACIONES')
@Controller('admin/sippci/capacitaciones/participantes')
export class ParticipantesController {
  constructor(private participantesService: ParticipantesService) {}

  @Get()
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Listar catalogo de participantes' })
  async listar(@Query() query: QueryParticipanteCapacitacionDto) {
    return this.participantesService.listarParticipantes(query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear participante en el catalogo' })
  async crear(@Body() dto: CrearParticipanteCapacitacionDto) {
    return this.participantesService.crearParticipante(dto);
  }
}
