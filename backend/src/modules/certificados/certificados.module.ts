import { Module } from '@nestjs/common';
import { CertificadosService } from './certificados.service';
import { CertificadosController } from './certificados.controller';
import { CertificadosPdfService } from './certificados-pdf.service';

@Module({
  controllers: [CertificadosController],
  providers: [CertificadosService, CertificadosPdfService],
  exports: [CertificadosService, CertificadosPdfService],
})
export class CertificadosModule {}
