import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CertificadosCapacitacionService } from './certificados.service';
import { EmitirCertificadoCapacitacionDto } from './dto/emitir-certificado-capacitacion.dto';
import { EmitirLoteCertificadoDto } from './dto/emitir-lote-certificado.dto';
import { QueryCertificadoCapacitacionDto } from './dto/query-certificado-capacitacion.dto';

@ApiTags('Certificados de Capacitación')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTOR_CAPACITACIONES')
@Controller('admin/sippci/capacitaciones/certificados')
export class CertificadosCapacitacionController {
  constructor(private service: CertificadosCapacitacionService) {}

  @Get()
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Listar certificados de capacitación emitidos' })
  async listar(@Query() query: QueryCertificadoCapacitacionDto) {
    return this.service.listar(query);
  }

  @Post('emitir')
  @ApiOperation({
    summary:
      'Emitir certificado individual (programación EN_CURSO/FINALIZADO y participante APROBADO)',
  })
  async emitir(
    @Body() dto: EmitirCertificadoCapacitacionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.emitir(dto, userId);
  }

  @Post('emitir-lote')
  @ApiOperation({ summary: 'Emitir certificados a todos los aprobados sin certificado' })
  async emitirLote(
    @Body() dto: EmitirLoteCertificadoDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.emitirLote(dto, userId);
  }

  @Get(':codigo/descargar')
  @Roles('GESTOR_CAPACITACIONES', 'ADMIN')
  @ApiOperation({ summary: 'Descargar el PDF del certificado' })
  async descargar(@Param('codigo') codigo: string, @Res() res: Response) {
    const ruta = await this.service.obtenerRutaPdf(codigo);
    return res.sendFile(ruta);
  }
}
