import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoProgramacion } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryProgramacionDto {
  @ApiPropertyOptional({ description: 'Busca en lugar u observaciones' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtra por curso', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursoId?: number;

  @ApiPropertyOptional({ description: 'Filtra por instructor', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  instructorId?: number;

  @ApiPropertyOptional({
    description: 'Filtra por estado',
    enum: EstadoProgramacion,
    example: EstadoProgramacion.PROGRAMADO,
  })
  @IsOptional()
  @IsEnum(EstadoProgramacion)
  estado?: EstadoProgramacion;

  @ApiPropertyOptional({ description: 'fechaInicio >= desde', example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ description: 'fechaInicio <= hasta', example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  hasta?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
