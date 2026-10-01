import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearProgramacionDto {
  @ApiProperty({ example: 1, description: 'Id del curso' })
  @IsInt()
  @IsPositive()
  cursoId!: number;

  @ApiPropertyOptional({ example: 1, description: 'Id del instructor' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  instructorId?: number;

  @ApiProperty({ example: '2026-10-15T09:00:00Z', description: 'Fecha ISO de inicio' })
  @IsDateString()
  fechaInicio!: string;

  @ApiPropertyOptional({ example: '2026-10-15T13:00:00Z', description: 'Fecha ISO de fin' })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ example: 'Aula 1' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  lugar?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cupo?: number;

  @ApiPropertyOptional({ example: 'Curso de prueba' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
