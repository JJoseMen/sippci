import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearInstructorDto } from './crear-instructor.dto';

export class ActualizarInstructorDto extends PartialType(CrearInstructorDto) {
  @ApiPropertyOptional({
    description:
      'Estado activo del instructor. Solo para API/tests (reactivacion); la UI no expone esta opcion.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
