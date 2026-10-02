import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { CertificadosPublicController } from './certificados-public.controller';
import { CertificadosPublicService } from './certificados-public.service';
import { CertificadosCapacitacionPublicController } from './certificados-capacitacion-public.controller';
import { CertificadosCapacitacionPublicService } from './certificados-capacitacion-public.service';

@Module({
  controllers: [
    PublicController,
    CertificadosPublicController,
    CertificadosCapacitacionPublicController,
  ],
  providers: [
    PublicService,
    CertificadosPublicService,
    CertificadosCapacitacionPublicService,
  ],
})
export class PublicModule {}
