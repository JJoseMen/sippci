import {
  Controller, Get, Post, Param, Query, Body, UseGuards, Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CumplimientoService } from './cumplimiento.service';
import { QueryCumplimientoDto } from './dto/query-cumplimiento.dto';
import {
  ObservarCumplimientoDto,
  RechazarCumplimientoDto,
  EmitirCertificadoCumplimientoDto,
} from './dto/accion-cumplimiento.dto';
import { ProgramarInspeccionDto } from './dto/programar-inspeccion.dto';
import { RegistrarInformeDto } from './dto/registrar-informe.dto';

@ApiTags('Cumplimiento SIPPCI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/sippci/cumplimiento')
export class CumplimientoController {
  constructor(private service: CumplimientoService) {}

  // ============ SOLICITUDES NATURAL ============
  @Get('solicitudes/natural')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  @ApiOperation({ summary: 'Listar solicitudes Natural' })
  async findNaturales(@Query() query: QueryCumplimientoDto) {
    return this.service.findSolicitudes('NATURAL', query);
  }

  @Get('solicitudes/natural/:codigo')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async findOneNatural(@Param('codigo') codigo: string) {
    return this.service.findOneSolicitud(codigo, 'NATURAL');
  }

  // ============ SOLICITUDES JURIDICA ============
  @Get('solicitudes/juridica')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async findJuridicas(@Query() query: QueryCumplimientoDto) {
    return this.service.findSolicitudes('JURIDICA', query);
  }

  @Get('solicitudes/juridica/:codigo')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async findOneJuridica(@Param('codigo') codigo: string) {
    return this.service.findOneSolicitud(codigo, 'JURIDICA');
  }

  // ============ ACCIONES ============
  @Post('solicitudes/:codigo/aprobar')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async aprobar(
    @Param('codigo') codigo: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.aprobar(codigo, userId);
  }

  @Post('solicitudes/:codigo/observar')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async observar(
    @Param('codigo') codigo: string,
    @Body() dto: ObservarCumplimientoDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.observar(codigo, dto.justificacion, userId);
  }

  @Post('solicitudes/:codigo/rechazar')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async rechazar(
    @Param('codigo') codigo: string,
    @Body() dto: RechazarCumplimientoDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.rechazar(codigo, dto.justificacion, userId);
  }

  @Post('solicitudes/:codigo/finalizar-revision-documentos')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  @ApiOperation({
    summary:
      'Finalizar revisión documental (NATURAL/JURIDICA/INFRA sin distinción): todos VALIDADOS → habilita inspección; con RECHAZADOS → OBSERVADA',
  })
  async finalizarRevision(
    @Param('codigo') codigo: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.finalizarRevisionDocumentos(codigo, userId);
  }

  // ============ INSPECCIONES ============
  @Post('solicitudes/:codigo/programar-inspeccion')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  @ApiOperation({ summary: 'Programar inspección técnica' })
  async programarInspeccion(
    @Param('codigo') codigo: string,
    @Body() dto: ProgramarInspeccionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.programarInspeccion(codigo, dto, userId);
  }

  @Get('inspecciones')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async listarInspecciones(@Query() query: QueryCumplimientoDto) {
    return this.service.listarInspecciones(query);
  }

  @Get('inspecciones/:id')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async findOneInspeccion(@Param('id') id: string) {
    return this.service.findOneInspeccion(parseInt(id, 10));
  }

  @Post('inspecciones/:id/registrar-informe')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async registrarInforme(
    @Param('id') id: string,
    @Body() dto: RegistrarInformeDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.registrarInforme(parseInt(id, 10), dto, userId);
  }

  // ============ CERTIFICADOS ============
  @Post('solicitudes/:codigo/emitir-certificado')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async emitirCertificado(
    @Param('codigo') codigo: string,
    @Body() dto: EmitirCertificadoCumplimientoDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.emitirCertificado(codigo, dto, userId);
  }

  @Get('certificados')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async listarCertificados(@Query() query: QueryCumplimientoDto) {
    return this.service.listarCertificados(query);
  }

  @Get('certificados/:codigo/descargar')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async descargarCertificado(
    @Param('codigo') codigo: string,
    @Res() res: Response,
  ) {
    const ruta = await this.service.obtenerRutaPdf(codigo);
    return res.sendFile(ruta);
  }

  // ============ REPORTES ============
  @Get('reportes/solicitudes-por-estado')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async reporteEstados() {
    return this.service.reporteSolicitudesPorEstado();
  }

  @Get('reportes/por-nivel-riesgo')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async reporteNivelRiesgo() {
    return this.service.reportePorNivelRiesgo();
  }

  @Get('reportes/certificados-por-mes')
  @Roles('ADMIN', 'GESTOR_CUMPLIMIENTO')
  async reporteCertificadosPorMes() {
    return this.service.reporteCertificadosPorMes();
  }
}
