import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfesionalesService } from './profesionales.service';
import { QueryProfesionalesDto } from './dto/query-profesionales.dto';
import { EmitirCertificadoDto } from './dto/emitir-certificado.dto';

@ApiTags('Profesionales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/profesionales')
export class ProfesionalesController {
  constructor(private profesionalesService: ProfesionalesService) {}

  // ============ SOLICITUDES NATURAL ============

  @Get('solicitudes/natural')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Listar solicitudes de Persona Natural' })
  async findNaturales(@Query() query: QueryProfesionalesDto) {
    return this.profesionalesService.findSolicitudes('NATURAL', query);
  }

  @Get('solicitudes/natural/:codigo')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Detalle de solicitud Persona Natural' })
  async findOneNatural(@Param('codigo') codigo: string) {
    return this.profesionalesService.findOneSolicitud(codigo, 'NATURAL');
  }

  // ============ SOLICITUDES JURIDICA ============

  @Get('solicitudes/juridica')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Listar solicitudes de Persona Jurídica' })
  async findJuridicas(@Query() query: QueryProfesionalesDto) {
    return this.profesionalesService.findSolicitudes('JURIDICA', query);
  }

  @Get('solicitudes/juridica/:codigo')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Detalle de solicitud Persona Jurídica' })
  async findOneJuridica(@Param('codigo') codigo: string) {
    return this.profesionalesService.findOneSolicitud(codigo, 'JURIDICA');
  }

  // ============ ACCIONES ============

  @Post('solicitudes/:codigo/aprobar')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Aprobar solicitud' })
  async aprobar(
    @Param('codigo') codigo: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.profesionalesService.aprobar(codigo, userId);
  }

  @Post('solicitudes/:codigo/observar')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Observar solicitud (requiere justificación)' })
  async observar(
    @Param('codigo') codigo: string,
    @Body() body: { justificacion: string },
    @CurrentUser('id') userId: number,
  ) {
    return this.profesionalesService.observar(codigo, body.justificacion, userId);
  }

  @Post('solicitudes/:codigo/finalizar-revision-documentos')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({
    summary:
      'Finalizar revisión documental (NATURAL y JURIDICA comparten flujo): todos VALIDADOS → REVISADO, con RECHAZADOS → OBSERVADA',
  })
  async finalizarRevision(
    @Param('codigo') codigo: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.profesionalesService.finalizarRevisionDocumentos(codigo, userId);
  }

  @Post('solicitudes/:codigo/rechazar')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Rechazar solicitud (requiere justificación)' })
  async rechazar(
    @Param('codigo') codigo: string,
    @Body() body: { justificacion: string },
    @CurrentUser('id') userId: number,
  ) {
    return this.profesionalesService.rechazar(codigo, body.justificacion, userId);
  }

  // ============ CERTIFICADOS ============

  @Post('solicitudes/:codigo/emitir-certificado')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Emitir certificado (solo si APROBADA)' })
  async emitirCertificado(
    @Param('codigo') codigo: string,
    @Body() dto: EmitirCertificadoDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.profesionalesService.emitirCertificado(codigo, dto, userId);
  }

  // ============ LISTA DE PROFESIONALES ============

  @Get('lista/naturales')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Lista de profesionales naturales certificados' })
  async listaNaturales(@Query() query: QueryProfesionalesDto) {
    return this.profesionalesService.listaCertificados('NATURAL', query);
  }

  @Get('lista/juridicas')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Lista de profesionales jurídicos certificados' })
  async listaJuridicas(@Query() query: QueryProfesionalesDto) {
    return this.profesionalesService.listaCertificados('JURIDICA', query);
  }

  // ============ CERTIFICADOS EMITIDOS ============

  @Get('certificados')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Todos los certificados emitidos' })
  async certificados(@Query() query: QueryProfesionalesDto) {
    return this.profesionalesService.listaCertificados(undefined, query);
  }

  // ============ REPORTES ============

  @Get('reportes/solicitudes-por-estado')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Reporte: solicitudes por estado' })
  async reporteEstados() {
    return this.profesionalesService.reporteSolicitudesPorEstado();
  }

  @Get('reportes/certificados-por-mes')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Reporte: certificados por mes' })
  async reporteCertificadosPorMes() {
    return this.profesionalesService.reporteCertificadosPorMes();
  }

  @Get('reportes/por-especialidad')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Reporte: profesionales por especialidad' })
  async reporteEspecialidad() {
    return this.profesionalesService.reportePorEspecialidad();
  }

  @Get('certificados/:codigo/descargar')
  @Roles('ADMIN', 'GESTOR_REGISTRO_PROFESIONAL')
  @ApiOperation({ summary: 'Descargar PDF del certificado' })
  async descargarCertificado(
    @Param('codigo') codigo: string,
    @Res() res: Response,
  ) {
    const ruta = await this.profesionalesService.obtenerRutaPdf(codigo);
    return res.sendFile(ruta);
  }
}
