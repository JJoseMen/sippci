import { Module } from '@nestjs/common';
import { CapacitacionesService } from './capacitaciones.service';
import { CapacitacionesController } from './capacitaciones.controller';
import { InstructoresService } from './instructores.service';
import { InstructoresController } from './instructores.controller';
import { ProgramacionesService } from './programaciones.service';
import { ProgramacionesController } from './programaciones.controller';
import { ParticipantesService } from './participantes.service';
import { ParticipantesController } from './participantes.controller';
import { ExcelService } from './services/excel.service';

@Module({
  controllers: [
    CapacitacionesController,
    InstructoresController,
    ProgramacionesController,
    ParticipantesController,
  ],
  providers: [
    CapacitacionesService,
    ExcelService,
    InstructoresService,
    ProgramacionesService,
    ParticipantesService,
  ],
  exports: [CapacitacionesService],
})
export class CapacitacionesModule {}
