import { PartialType } from '@nestjs/swagger';
import { CrearProgramacionDto } from './crear-programacion.dto';

export class ActualizarProgramacionDto extends PartialType(CrearProgramacionDto) {}
