import { Module } from '@nestjs/common';
import { CapacitacionesService } from './capacitaciones.service';
import { CapacitacionesController } from './capacitaciones.controller';
import { InstructoresService } from './instructores.service';
import { InstructoresController } from './instructores.controller';
import { ProgramacionesService } from './programaciones.service';
import { ProgramacionesController } from './programaciones.controller';
import { ParticipantesService } from './participantes.service';
import { ParticipantesController } from './participantes.controller';
import { CertificadosCapacitacionService } from './certificados.service';
import { CertificadosCapacitacionController } from './certificados.controller';
import { CertificadosModule } from '../certificados/certificados.module';
import { ExcelService } from './services/excel.service';

@Module({
  imports: [CertificadosModule],
  controllers: [
    CapacitacionesController,
    InstructoresController,
    ProgramacionesController,
    ParticipantesController,
    CertificadosCapacitacionController,
  ],
  providers: [
    CapacitacionesService,
    ExcelService,
    InstructoresService,
    ProgramacionesService,
    ParticipantesService,
    CertificadosCapacitacionService,
  ],
  exports: [CapacitacionesService],
})
export class CapacitacionesModule {}
