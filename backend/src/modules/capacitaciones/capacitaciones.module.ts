import { Module } from '@nestjs/common';
import { CapacitacionesService } from './capacitaciones.service';
import { CapacitacionesController } from './capacitaciones.controller';
import { InstructoresService } from './instructores.service';
import { InstructoresController } from './instructores.controller';
import { ExcelService } from './services/excel.service';

@Module({
  controllers: [CapacitacionesController, InstructoresController],
  providers: [CapacitacionesService, ExcelService, InstructoresService],
  exports: [CapacitacionesService],
})
export class CapacitacionesModule {}
