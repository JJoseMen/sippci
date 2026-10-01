import { PartialType } from '@nestjs/swagger';
import { CrearInstructorDto } from './crear-instructor.dto';

export class ActualizarInstructorDto extends PartialType(CrearInstructorDto) {}
