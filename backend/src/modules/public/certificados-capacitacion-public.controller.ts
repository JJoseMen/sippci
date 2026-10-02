import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CertificadosCapacitacionPublicService } from './certificados-capacitacion-public.service';

@ApiTags('Public - Validación Capacitación')
@Controller('public/validar-certificado-capacitacion')
export class CertificadosCapacitacionPublicController {
  constructor(private service: CertificadosCapacitacionPublicService) {}

  @Get(':codigo')
  @Public()
  @ApiOperation({ summary: 'Validar certificado de capacitación (público)' })
  async validar(@Param('codigo') codigo: string) {
    return this.service.validar(codigo);
  }
}
