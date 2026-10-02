import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { CapacitacionesService } from './capacitaciones.service';
import {
  CapacitacionesController,
  CertificadoPublicoController,
} from './capacitaciones.controller';
import { InstructoresService } from './instructores.service';
import { InstructoresController } from './instructores.controller';
import { ProgramacionesService } from './programaciones.service';
import { ProgramacionesController } from './programaciones.controller';
import { ParticipantesService } from './participantes.service';
import { ParticipantesController } from './participantes.controller';
import { CertificadosCapacitacionService } from './certificados.service';
import { CertificadosCapacitacionController } from './certificados.controller';
import { CertificadosModule } from '../certificados/certificados.module';
import { RegistroCapacitacionesService } from './registro-capacitaciones.service';
import { RevisionCapacitacionesService } from './revision-capacitaciones.service';
import { ExcelService } from './services/excel.service';
import { PdfService } from './services/pdf.service';

@Module({
  imports: [CertificadosModule, NotificacionesModule],
  controllers: [
    CapacitacionesController,
    CertificadoPublicoController,
    InstructoresController,
    ProgramacionesController,
    ParticipantesController,
    CertificadosCapacitacionController,
  ],
  providers: [
    CapacitacionesService,
    RegistroCapacitacionesService,
    RevisionCapacitacionesService,
    ExcelService,
    PdfService,
    InstructoresService,
    ProgramacionesService,
    ParticipantesService,
    CertificadosCapacitacionService,
  ],
  exports: [
    CapacitacionesService,
    RegistroCapacitacionesService,
    RevisionCapacitacionesService,
  ],
})
export class CapacitacionesModule {}