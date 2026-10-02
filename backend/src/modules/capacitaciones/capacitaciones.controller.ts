import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CapacitacionesService } from './capacitaciones.service';
import { RegistroCapacitacionesService } from './registro-capacitaciones.service';
import { RevisionCapacitacionesService } from './revision-capacitaciones.service';
import { CrearParticipanteDto } from './dto/crear-participante.dto';
import { QueryParticipanteDto } from './dto/query-participante.dto';
import { RevisarParticipanteDto } from './dto/revisar-participante.dto';
import { ObservacionDto, RepresentanteDto } from './dto/acciones-participante.dto';

@ApiTags('Capacitaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTOR_CAPACITACIONES')
@Controller()
export class CapacitacionesController {
  constructor(
    private capacitacionesService: CapacitacionesService,
    private registroService: RegistroCapacitacionesService,
    private revisionService: RevisionCapacitacionesService,
  ) {}

  private stream(res: Response, archivo: { ruta: string; nombre: string; mime: string }) {
    res.set({
      'Content-Type': archivo.mime,
      'Content-Disposition': `inline; filename="${archivo.nombre}"`,
    });
    return new StreamableFile(createReadStream(archivo.ruta));
  }

  @Get('cursos')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Listar cursos activos' })
  listarCursos() {
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

  @Get('solicitudes/:codigo/plantilla-excel')
  @ApiOperation({ summary: 'Descargar plantilla Excel de participantes' })
  async plantillaExcel(@Res({ passthrough: true }) res: Response) {
    const plantilla = await this.registroService.descargarPlantilla();
    res.set({
      'Content-Type': plantilla.mime,
      'Content-Disposition': `attachment; filename="${plantilla.nombre}"`,
    });
    return new StreamableFile(plantilla.buffer);
  }

  @Post('solicitudes/:codigo/lista-excel')
  @ApiOperation({ summary: 'Subir lista de participantes via Excel' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  subirLista(
    @Param('codigo') codigo: string,
    @UploadedFile() file: any,
    @CurrentUser('id') userId: number,
  ) {
    return this.registroService.subirLista(codigo, file, userId);
  }

  @Post('solicitudes/:codigo/agregar-solicitante')
  @ApiOperation({ summary: 'Registrar al solicitante (persona natural) como participante' })
  agregarSolicitante(
    @Param('codigo') codigo: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.registroService.agregarSolicitante(codigo, userId);
  }

  @Post('solicitudes/:codigo/agregar-representante')
  @ApiOperation({ summary: 'Incluir o excluir al representante legal como participante' })
  agregarRepresentante(
    @Param('codigo') codigo: string,
    @Body() dto: RepresentanteDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.registroService.agregarRepresentante(codigo, dto.esRepresentante, userId);
  }

  @Get('participantes/:subCodigo/formulario-pdf')
  @ApiOperation({ summary: 'Descargar formulario PDF de un participante' })
  async formularioPdf(
    @Param('subCodigo') subCodigo: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const archivo = await this.capacitacionesService.descargarFormulario(subCodigo);
    return this.stream(res, archivo);
  }

  @Post('participantes/:subCodigo/aprobar')
  @ApiOperation({ summary: 'Aprobar un participante' })
  aprobar(
    @Param('subCodigo') subCodigo: string,
    @Body() dto: RevisarParticipanteDto,
    @CurrentUser('id') usuarioInternoId: number,
  ) {
    return this.revisionService.aprobarParticipante(subCodigo, usuarioInternoId, dto);
  }

  @Post('participantes/:subCodigo/rechazar')
  @ApiOperation({ summary: 'Rechazar un participante' })
  rechazar(
    @Param('subCodigo') subCodigo: string,
    @Body() dto: ObservacionDto,
    @CurrentUser('id') usuarioInternoId: number,
  ) {
    return this.revisionService.rechazarParticipante(subCodigo, dto.observacion ?? '', usuarioInternoId);
  }

  @Post('participantes/:subCodigo/reprobar')
  @ApiOperation({ summary: 'Reprobar un participante' })
  reprobar(
    @Param('subCodigo') subCodigo: string,
    @Body() dto: RevisarParticipanteDto,
    @CurrentUser('id') usuarioInternoId: number,
  ) {
    return this.revisionService.reprobarParticipante(subCodigo, dto.observacion ?? '', usuarioInternoId, dto);
  }

  @Post('solicitudes/:codigo/aprobar-todos')
  @ApiOperation({ summary: 'Aprobar todos los participantes en masa' })
  aprobarTodos(@Param('codigo') codigo: string, @CurrentUser('id') usuarioInternoId: number) {
    return this.revisionService.aprobarTodos(codigo, usuarioInternoId);
  }

  @Post('solicitudes/:codigo/emitir-certificados')
  @ApiOperation({ summary: 'Emitir certificados de los participantes aprobados' })
  emitirCertificados(
    @Param('codigo') codigo: string,
    @CurrentUser('id') usuarioInternoId: number,
  ) {
    return this.revisionService.emitirCertificados(codigo, usuarioInternoId);
  }

  @Get('participantes/:subCodigo/certificado')
  @ApiOperation({ summary: 'Descargar certificado PDF de un participante' })
  async certificado(
    @Param('subCodigo') subCodigo: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const archivo = await this.revisionService.descargarCertificado(subCodigo);
    return this.stream(res, archivo);
  }

  @Delete('participantes/:id')
  @ApiOperation({ summary: 'Eliminar participante (ciudadano en BORRADOR)' })
  eliminar(@Param('id') id: string, @CurrentUser('id') userId: number) {
    return this.capacitacionesService.eliminarParticipante(+id, userId);
  }

  @Get('solicitudes/:codigo/costo-total')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Calcular costo total de capacitacion' })
  costoTotal(@Param('codigo') codigo: string) {
    return this.capacitacionesService.calcularCostoTotal(codigo);
  }
}

@ApiTags('Capacitaciones')
@Controller('public/certificados')
export class CertificadoPublicoController {
  constructor(private revisionService: RevisionCapacitacionesService) {}

  @Get('verificar/:codigoCertificado')
  @Public()
  @ApiOperation({ summary: 'Verificar autenticidad de un certificado' })
  verificar(@Param('codigoCertificado') codigoCertificado: string) {
    return this.revisionService.verificarCertificado(codigoCertificado);
  }
}