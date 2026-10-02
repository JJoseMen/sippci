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
  MinLength,
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

  @ApiPropertyOptional({
    description: 'Obligatoria al corregir un resultado previo',
    example: 'El instructor se equivoco',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  justificacion?: string;
}
