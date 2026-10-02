import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

enum CalificacionParticipante {
  APROBADO = 'APROBADO',
  REPROBADO = 'REPROBADO',
}

export class RevisarParticipanteDto {
  @ApiPropertyOptional({ example: 'CAP. JUAN PEREZ' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  instructor?: string;

  @ApiPropertyOptional({ enum: CalificacionParticipante, example: 'APROBADO' })
  @IsOptional()
  @IsEnum(CalificacionParticipante)
  calificacion?: string;

  @ApiPropertyOptional({ example: 'Documento sin validez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  observacion?: string;
}