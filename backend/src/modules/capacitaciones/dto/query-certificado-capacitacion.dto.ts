import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoCertificadoCapacitacion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCertificadoCapacitacionDto {
  @ApiPropertyOptional({ description: 'Busca por codigo, participante o CI' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtra por programacion', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  programacionId?: number;

  @ApiPropertyOptional({ description: 'Filtra por curso', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursoId?: number;

  @ApiPropertyOptional({
    description: 'Filtra por estado del certificado',
    enum: EstadoCertificadoCapacitacion,
  })
  @IsOptional()
  @IsEnum(EstadoCertificadoCapacitacion)
  estado?: EstadoCertificadoCapacitacion;

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
