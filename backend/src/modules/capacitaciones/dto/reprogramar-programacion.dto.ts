import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReprogramarProgramacionDto {
  @ApiProperty({ example: '2026-10-20T09:00:00Z', description: 'Nueva fecha ISO de inicio' })
  @IsDateString()
  fechaInicio!: string;

  @ApiPropertyOptional({ example: '2026-10-20T13:00:00Z', description: 'Nueva fecha ISO de fin' })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ example: 'Cambio por feriado' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
