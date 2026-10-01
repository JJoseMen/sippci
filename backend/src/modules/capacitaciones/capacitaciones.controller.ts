import { Body, Controller, Delete, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CapacitacionesService } from './capacitaciones.service';
import { CrearParticipanteDto } from './dto/crear-participante.dto';
import { QueryParticipanteDto } from './dto/query-participante.dto';

@ApiTags('Capacitaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTOR_CAPACITACIONES')
@Controller()
export class CapacitacionesController {
  constructor(private capacitacionesService: CapacitacionesService) {}

  @Get('cursos')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Listar cursos activos' })
  async listarCursos() {
    return this.capacitacionesService.listarCursos();
  }

  @Post('solicitudes/:codigo/participantes')
  @ApiOperation({ summary: 'Agregar participante a una solicitud' })
  async agregarParticipante(
    @Param('codigo') codigo: string,
    @Body() dto: CrearParticipanteDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.capacitacionesService.agregarParticipante(codigo, dto, userId);
  }

  @Get('solicitudes/:codigo/participantes')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Listar participantes de una solicitud' })
  async listarParticipantes(
    @Param('codigo') codigo: string,
    @Query() query: QueryParticipanteDto,
  ) {
    return this.capacitacionesService.listarParticipantes(codigo, query);
  }

  @Post('solicitudes/:codigo/lista-excel')
  @ApiOperation({ summary: 'Subir lista de participantes via Excel' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async subirLista(
    @Param('codigo') codigo: string,
    @UploadedFile() file: any,
    @CurrentUser('id') userId: number,
  ) {
    return this.capacitacionesService.subirLista(codigo, file, userId);
  }

  @Delete('participantes/:id')
  @ApiOperation({ summary: 'Eliminar participante' })
  async eliminar(
    @Param('id') id: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.capacitacionesService.eliminarParticipante(+id, userId);
  }

  @Get('solicitudes/:codigo/costo-total')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Calcular costo total de capacitacion' })
  async costoTotal(@Param('codigo') codigo: string) {
    return this.capacitacionesService.calcularCostoTotal(codigo);
  }
}
