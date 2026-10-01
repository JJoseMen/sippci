import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoParticipante } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ActualizarEstadoParticipanteDto {
  @ApiPropertyOptional({
    enum: EstadoParticipante,
    description: 'Estado de la persona (participantes_capacitacion.estado)',
    example: EstadoParticipante.APROBADO,
  })
  @IsOptional()
  @IsEnum(EstadoParticipante)
  estado?: EstadoParticipante;

  @ApiPropertyOptional({
    description: 'true = ASISTIO, false = NO_ASISTIO',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  asistencia?: boolean;

  @ApiPropertyOptional({
    description: 'true = APROBADO, false = REPROBADO',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  aprobado?: boolean;

  @ApiPropertyOptional({ example: 85, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  puntaje?: number;

  @ApiPropertyOptional({ example: 'Presento documentacion incompleta' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
